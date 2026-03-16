# MetaPool

## 프로젝트
Metadium 블록체인 기반 META 토큰 Binary(Yes/No) 예측 마켓 플랫폼

## 기술 스택
- Smart Contract: Solidity ^0.8.20, OpenZeppelin v5.x, Hardhat v3
- Frontend: React 19, Vite 8, ethers.js v6, Tailwind CSS v4, react-router-dom, react-i18next, lucide-react
- Blockchain: Metadium (Mainnet Chain ID: 11, Testnet Chain ID: 12), Hardhat localhost (Chain ID: 31337)

## 디렉토리
- `contracts/` — Solidity 스마트 컨트랙트
- `test/` — 컨트랙트 테스트
- `scripts/` — 배포 스크립트
- `frontend/` — React + ethers.js 프론트엔드
- `docs/` — 프로젝트 문서

## 실행
- 설치: `npm install && cd frontend && npm install`
- 컴파일: `npx hardhat compile`
- 테스트: `npx hardhat test` (225개)
- 로컬 노드: `npx hardhat node`
- 로컬 배포: `npx hardhat run scripts/deploy-testnet.js --network localhost`
- 샘플 마켓: `CONTRACT_ADDRESS=0x... npx hardhat run scripts/create-test-markets.js --network localhost`
- 프론트 개발: `cd frontend && npm run dev`

## 로컬 개발 흐름
1. `npx hardhat node` (터미널 1)
2. `npx hardhat run scripts/deploy-testnet.js --network localhost` (터미널 2)
3. 출력된 컨트랙트 주소를 `frontend/.env.development`의 `VITE_CONTRACT_ADDRESS`에 설정
4. `cd frontend && npm run dev` (터미널 3)
5. http://localhost:5173 접속 (로컬 모드에서는 MetaMask 없이 Hardhat Account #0으로 자동 서명)

## 프로젝트 관리
- 방식: file
- 기능 32개 전체 완료 (F-01~F-32) + 관리자 패널 + 히스토리 페이지
