# MetaPool

## 프로젝트
Metadium 블록체인 기반 META 토큰 Binary(Yes/No) 예측 마켓 플랫폼

## 기술 스택
- Smart Contract: Solidity ^0.8.20, OpenZeppelin v5.x, Hardhat v3
- Frontend: React 19, Vite 8, ethers.js v6, Tailwind CSS v4, react-router-dom, react-i18next, lucide-react
- Backend: Express 5, better-sqlite3, node-cron, ethers.js v6
- Blockchain: Metadium (Mainnet Chain ID: 11, Testnet Chain ID: 12), Hardhat localhost (Chain ID: 31337)

## 디렉토리
- `contracts/` — Solidity 스마트 컨트랙트 (Referral 포함)
- `test/` — 컨트랙트 테스트 (225개)
- `scripts/` — 배포/마켓 생성 스크립트
- `frontend/` — React + ethers.js 프론트엔드
- `backend/` — Express API + Oracle resolver + Telegram bot
- `docs/` — 프로젝트 문서

## 실행
- 설치: `npm install && cd frontend && npm install && cd ../backend && npm install`
- 컴파일: `npx hardhat compile`
- 테스트: `npx hardhat test` (225개)
- 로컬 노드: `npx hardhat node`
- 로컬 배포: `npx hardhat run scripts/deploy-testnet.js --network localhost`
- 샘플 마켓: `CONTRACT_ADDRESS=0x... npx hardhat run scripts/create-test-markets.js --network localhost`
- 프론트 개발: `cd frontend && npm run dev`
- 백엔드 개발: `cd backend && npm run dev`

## 로컬 개발 흐름
1. `npx hardhat node` (터미널 1)
2. `npx hardhat run scripts/deploy-testnet.js --network localhost` (터미널 2)
3. 출력된 컨트랙트 주소를 `frontend/.env.development`의 `VITE_CONTRACT_ADDRESS`에 설정
4. `cd frontend && npm run dev` (터미널 3)
5. http://localhost:5173 접속 (로컬 모드에서는 MetaMask 없이 Hardhat Account #0으로 자동 서명)

## 테스트넷 배포
- 서버: dev-pc-01 (10.150.255.48, user `ubuntu`, 키 aws-jsong-nopass.pem, 메타 5+1 통합 호스팅)
- 네트워크: Metadium Testnet (Chain ID: 12)
- MetaPool (v2, referral + C1 dispute resolver): `0x8dc00E4eFf93f40D2A056224d5f59e316FDaC571`
- C1 어댑터 (MetaPoolDisputeResolver): `0xD9cAd738A0adC781BA4fE5E5d6fE817Fd6397dc3`
- MetaStake OperatorRegistry (dispute-resolver serviceId=1): `0x19F412E4FB526b3eb89e0bd62A06D2184D915B89`
- Owner: `0x6FDd10fBa4887d9c523345D33B76d2c84073eC70`
- 프론트엔드: https://metapool-testnet.metadium.club (pm2 `metapool`, `npx serve -s dist -l 3201`)
- 백엔드 API: https://api.metapool-testnet.metadium.club (pm2 `metapool-api`, port 3202)
- 마켓 16개 생성 (Crypto 4, Sports 3, Weather 2, Politics 2, Entertainment 3, Other 2)
- 구버전(v1 폐기): MetaPool `0x69C373702BcB7C4F48ee4D828CD9f90b413c2a16`

## 테스트넷 배포 흐름
- ⚠️ Hardhat 3는 **Node 22+** 필요. 서버 시스템 node는 20(nodesource)이므로 nvm으로 22 사용:
  `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22`
  (peer deps 누락 시: `npm install --no-save --legacy-peer-deps` 로 toolbox peer 설치)
1. `ssh -i ~/.ssh/aws-jsong-nopass.pem ubuntu@10.150.255.48`
2. `cd ~/MetaPool && git pull`
3. `nvm use 22 && npx hardhat compile`
4. `set -a; . backend/.env; set +a` (배포키 로드) → `npx hardhat run scripts/deploy-testnet.js --network metadiumTestnet`
5. C1 어댑터: `METAPOOL_ADDRESS=0x... OPERATOR_REGISTRY_ADDRESS=0x19F4... DISPUTE_SERVICE_ID=1 npx hardhat run scripts/deploy-dispute-resolver.js --network metadiumTestnet`
6. `CONTRACT_ADDRESS=0x... npx hardhat run scripts/create-bulk-markets.js --network metadiumTestnet`
7. `frontend/.env.production`(VITE_CONTRACT_ADDRESS) + `backend/.env`(CONTRACT_ADDRESS) 업데이트
8. `cd frontend && npm run build && pm2 restart metapool`
9. `pm2 restart metapool-api --update-env`

## 백엔드 API
- `GET /api/health` — 서버 상태
- `GET /api/did/:address` — DID 매핑 조회
- `POST /api/did/batch` — DID 닉네임 일괄 조회 (리더보드)
- `POST /api/did/register` — DID 등록 (MyKeepin OAuth callback)
- `GET /api/leaderboard` — 리더보드 캐시
- `POST /api/oracle/scan` — Oracle 수동 스캔
- `GET /api/oracle/logs` — Oracle 실행 로그

## 컨트랙트 Referral
- `setReferrer(address)` — 레퍼러 등록 (첫 베팅 전 1회)
- `placeBet` — 첫 베팅 시 양쪽 각 500 META 보상 크레딧
- `claimReferralReward()` — 보상 클레임
- `fundReferralPool()` — Owner 보상 풀 충전
- `setReferralRewardAmount(uint256)` — 보상 금액 변경

## 프로젝트 관리
- 방식: file
- 기능 32개 전체 완료 (F-01~F-32) + 관리자 패널 + 히스토리 페이지
- DID 인프라: 백엔드 API + Oracle resolver + Telegram bot 구축 완료
- 다음 단계: MyKeepin OAuth 연동, Telegram 봇 토큰 설정
