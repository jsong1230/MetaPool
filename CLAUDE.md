# MetaPool

## 프로젝트
Metadium 블록체인 기반 META 토큰 Binary(Yes/No) 예측 마켓 플랫폼

## 기술 스택
- Smart Contract: Solidity ^0.8.19, OpenZeppelin v5.x, Hardhat
- Frontend: React 18+, Vite 5+, ethers.js v6, Tailwind CSS v4, react-i18next
- Blockchain: Metadium (Mainnet Chain ID: 11, Testnet Chain ID: 12)

## 디렉토리
- `contracts/` — Solidity 스마트 컨트랙트
- `test/` — 컨트랙트 테스트
- `scripts/` — 배포 스크립트
- `frontend/` — React + ethers.js 프론트엔드
- `docs/` — 프로젝트 문서

## 실행
- 설치: `npm install && cd frontend && npm install`
- 컴파일: `npx hardhat compile`
- 테스트: `npx hardhat test`
- 로컬 노드: `npx hardhat node`
- 프론트 개발: `cd frontend && npm run dev`

## 프로젝트 관리
- 방식: file
