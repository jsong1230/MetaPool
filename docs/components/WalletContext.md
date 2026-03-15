# WalletContext

## 개요

MetaMask 지갑 연결 상태를 전역 공유하는 React Context. F-13 인수조건을 구현한다.

**파일 위치:** `frontend/src/contexts/WalletContext.jsx`

---

## 제공 상태

| 필드 | 타입 | 설명 |
|------|------|------|
| `account` | `string \| null` | 연결된 지갑 주소 (checksummed) |
| `balance` | `bigint \| null` | 잔액 (wei 단위) |
| `chainId` | `number \| null` | 현재 연결된 체인 ID |
| `isConnected` | `boolean` | 지갑 연결 여부 |
| `isConnecting` | `boolean` | 연결 진행 중 여부 |
| `isCorrectNetwork` | `boolean` | ALLOWED_CHAIN_IDS 내 포함 여부 |
| `error` | `string \| null` | 마지막 오류 메시지 |

## 제공 액션

| 함수 | 설명 |
|------|------|
| `connectWallet()` | MetaMask 연결 요청 |
| `disconnectWallet()` | 로컬 상태 초기화 |
| `switchNetwork()` | ACTIVE_NETWORK로 전환 요청 |
| `setError(msg)` | 에러 메시지 직접 설정 |

---

## 사용 방법

```jsx
// 1. Provider로 감싸기
import { WalletProvider } from './contexts/WalletContext.jsx';

function App() {
  return (
    <WalletProvider>
      <YourApp />
    </WalletProvider>
  );
}

// 2. useWallet 훅으로 소비
import { useWallet } from './hooks/useWallet.js';

function ConnectButton() {
  const { isConnected, account, connectWallet } = useWallet();
  return isConnected
    ? <span>{account}</span>
    : <button onClick={connectWallet}>연결</button>;
}
```

---

## 이벤트 리스닝

마운트 시 자동으로 MetaMask 이벤트를 구독한다.

- `accountsChanged` — 계정 변경 시 account, balance 갱신
- `chainChanged` — 체인 변경 시 chainId, balance 갱신
- 페이지 새로고침 후 `eth_accounts`로 기존 연결 복원

언마운트 시 리스너 자동 해제, 잔액 폴링 중지.

---

## 잔액 폴링

- 지갑 연결 시 즉시 잔액 조회 후 15초 주기 폴링 시작
- 계정/체인 변경 시 즉시 재조회
- 연결 해제 시 폴링 중지

---

## 네트워크 허용 목록

`ALLOWED_CHAIN_IDS` (lib/constants.js):
- Metadium Mainnet: `11` (0xb)
- Metadium Testnet: `12` (0xc)
- Localhost Hardhat: `31337` (0x7a69)
