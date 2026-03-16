/**
 * ethers.js Provider / Signer / Contract 인스턴스 팩토리
 * 컴포넌트는 이 모듈을 통해서만 컨트랙트에 접근한다
 */
import { ethers } from 'ethers';
import ABI from './abi/MetaPool.json';
import { CONTRACT_ADDRESS, RPC_URL } from './constants.js';

/**
 * 읽기 전용 Provider (MetaMask 불필요)
 * @returns {ethers.JsonRpcProvider}
 */
export function getProvider() {
  return new ethers.JsonRpcProvider(RPC_URL);
}

/**
 * 로컬 개발 모드 여부 (Hardhat 노드 직접 서명, MetaMask 불필요)
 */
const IS_LOCAL_DEV = RPC_URL.includes('127.0.0.1') || RPC_URL.includes('localhost');

/**
 * Signer 획득
 * - 로컬 개발: JsonRpcProvider에서 Hardhat 계정 직접 사용 (MetaMask 우회)
 * - 프로덕션: MetaMask BrowserProvider 사용
 * @returns {Promise<ethers.Signer>}
 */
export async function getSigner() {
  if (IS_LOCAL_DEV) {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    return provider.getSigner(0); // Hardhat Account #0
  }
  if (!window.ethereum) {
    throw new Error('MetaMask가 설치되어 있지 않습니다');
  }
  const provider = new ethers.BrowserProvider(window.ethereum);
  return provider.getSigner();
}

/**
 * 읽기 전용 컨트랙트 인스턴스 (view 함수 호출용)
 * @returns {ethers.Contract}
 */
export function getReadContract() {
  if (!CONTRACT_ADDRESS) {
    throw new Error('CONTRACT_ADDRESS 환경변수가 설정되지 않았습니다');
  }
  return new ethers.Contract(CONTRACT_ADDRESS, ABI, getProvider());
}

/**
 * 쓰기 컨트랙트 인스턴스 (state-changing 함수 호출용, MetaMask 서명 필요)
 * @returns {Promise<ethers.Contract>}
 */
export async function getWriteContract() {
  if (!CONTRACT_ADDRESS) {
    throw new Error('CONTRACT_ADDRESS 환경변수가 설정되지 않았습니다');
  }
  const signer = await getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
}

/**
 * 컨트랙트 에러 파싱
 * @param {Error} err
 * @returns {{ type: string, name?: string, args?: any[], message: string }}
 */
export function parseContractError(err) {
  // 사용자 거부
  if (err.code === 'ACTION_REJECTED' || err.code === 4001) {
    return { type: 'USER_REJECTED', message: '사용자가 트랜잭션을 거부했습니다' };
  }

  // 잔액 부족
  if (err.code === 'INSUFFICIENT_FUNDS') {
    return { type: 'INSUFFICIENT_FUNDS', message: '잔액이 부족합니다' };
  }

  // 컨트랙트 revert (Custom Error)
  if (err.data) {
    try {
      const readContract = getReadContract();
      const decodedError = readContract.interface.parseError(err.data);
      return {
        type: 'CONTRACT_ERROR',
        name: decodedError.name,
        args: decodedError.args,
        message: getContractErrorMessage(decodedError.name),
      };
    } catch {
      // 파싱 실패 시 원시 메시지 사용
    }
  }

  // 네트워크/RPC 에러
  return { type: 'NETWORK_ERROR', message: err.message || '네트워크 연결을 확인해주세요' };
}

/**
 * Custom Error name → 사용자 친화적 메시지
 */
function getContractErrorMessage(errorName) {
  const messages = {
    MarketNotActive: '마켓이 활성 상태가 아닙니다',
    BettingDeadlinePassed: '베팅 마감 시간이 지났습니다',
    BetAmountTooLow: '최소 베팅 금액보다 작습니다',
    BetAmountTooHigh: '최대 베팅 금액을 초과했습니다',
    OppositeBetExists: '반대 방향으로 이미 베팅했습니다',
    AlreadyClaimed: '이미 클레임했습니다',
    NotWinner: '승리 방향에 베팅하지 않았습니다',
    MarketNotResolved: '마켓이 아직 확정되지 않았습니다',
    MarketNotVoided: '무효 처리된 마켓이 아닙니다',
    NoBetFound: '베팅 기록이 없습니다',
    NotOwner: '관리자 권한이 없습니다',
    TransferFailed: '전송에 실패했습니다',
    ContractPaused: '컨트랙트가 일시 중단되었습니다',
    MarketPaused: '마켓이 일시 중단되었습니다',
  };
  return messages[errorName] || `컨트랙트 오류: ${errorName}`;
}
