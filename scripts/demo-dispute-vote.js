/**
 * C1 어댑터 투표 흐름 E2E 데모 (로컬 hardhat)
 *
 * 실제 배포된 것과 동일한 컨트랙트 코드로 dispute → operator majority vote →
 * 자동 resolve 전 과정을 실제 트랜잭션으로 재현한다.
 * (라이브 테스트넷은 submitDispute가 1000 META를 요구해 자금 제약으로 불가)
 *
 * 실행: npx hardhat run scripts/demo-dispute-vote.js
 *
 * registry는 MockOperatorRegistry 사용 — 어댑터가 의존하는 인터페이스
 * (getOperator/operatorCount)를 실제 OperatorRegistry와 동일하게 구현.
 * 실제 테스트넷에는 operator 3명이 이미 stake/active 상태로 등록됨.
 */
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.connect();

const E = (n) => ethers.parseEther(String(n));
const Outcome = { Undecided: 0, Yes: 1, No: 2, Void: 3 };
const line = () => console.log("─".repeat(58));

async function main() {
  const [owner, user1, user2, op0, op1, op2] = await ethers.getSigners();
  const SERVICE_ID = 1n;

  console.log("\n╔══ C1 어댑터 투표 흐름 E2E 데모 ══╗\n");

  // ── 배포 ──
  const MetaPool = await ethers.getContractFactory("MetaPool");
  const metaPool = await MetaPool.deploy(owner.address, E(1), E(100000), 200);
  const Registry = await ethers.getContractFactory("MockOperatorRegistry");
  const registry = await Registry.deploy();
  const Resolver = await ethers.getContractFactory("MetaPoolDisputeResolver");
  const resolver = await Resolver.deploy(
    owner.address, await metaPool.getAddress(), await registry.getAddress(), SERVICE_ID
  );

  console.log("배포:");
  console.log("  MetaPool v2      :", await metaPool.getAddress());
  console.log("  DisputeResolver  :", await resolver.getAddress());
  console.log("  OperatorRegistry :", await registry.getAddress(), "(mock)");

  // ── operator 3명 등록 + 어댑터 wiring ──
  for (const op of [op0, op1, op2]) await registry.setOperator(SERVICE_ID, op.address, true);
  await metaPool.setDisputeResolver(await resolver.getAddress());
  console.log("\noperator 3명 stake/active, disputeResolver 연결 완료");
  console.log("  adapter.operatorCount() =", (await resolver.operatorCount()).toString(), "→ 과반 = 2표");

  // ── 마켓 생성 + 베팅 ──
  line();
  const now = await networkHelpers.time.latest();
  const bettingDeadline = now + 3600;
  await metaPool.createMarket("Will BTC exceed $100K?", "BTC 10만불?", "", "", 0, bettingDeadline, now + 86400);
  const marketId = 1n;
  await metaPool.connect(user1).placeBet(marketId, true, { value: E(1000) });   // Yes
  await metaPool.connect(user2).placeBet(marketId, false, { value: E(1500) });  // No
  console.log(`마켓 #${marketId} 생성 · user1 Yes 1000 · user2 No 1500`);

  // ── 결과 확정 (Yes) ──
  await networkHelpers.time.increaseTo(bettingDeadline + 1);
  await metaPool.connect(owner).resolveMarket(marketId, Outcome.Yes);
  console.log("owner가 Yes 확정 → user2(No)는 패자");

  // ── 이의 제출 (패자 user2, 1000 META 스테이크) ──
  line();
  await metaPool.connect(user2).submitDispute(marketId, { value: E(1000) });
  let d = await metaPool.getDispute(marketId, user2.address);
  console.log(`user2 이의 제출: stake=${ethers.formatEther(d.stake)} META, resolved=${d.resolved}`);

  // ── operator 투표 ──
  line();
  console.log("operator 투표 시작 (accept = 이의 인정):");

  await resolver.connect(op0).voteDispute(marketId, user2.address, true);
  d = await metaPool.getDispute(marketId, user2.address);
  console.log(`  op0 accept → 1표 · dispute.resolved = ${d.resolved} (미실행, 과반 아님)`);

  // op1 투표로 실행 → 이 순간 user2는 tx를 보내지 않으므로 잔액 변화 = 순수 반환액
  const balBefore = await ethers.provider.getBalance(user2.address);
  const tx = await resolver.connect(op1).voteDispute(marketId, user2.address, true);
  const rc = await tx.wait();
  d = await metaPool.getDispute(marketId, user2.address);
  console.log(`  op1 accept → 2표 · 과반 도달! 어댑터가 resolveDispute 자동 호출`);

  // 이벤트 확인
  const evNames = rc.logs.map(l => { try { return resolver.interface.parseLog(l)?.name; } catch { return null; } }).filter(Boolean);
  console.log(`    어댑터 이벤트: ${evNames.join(", ")}`);

  // ── 결과 ──
  line();
  const balAfter = await ethers.provider.getBalance(user2.address);
  console.log("최종 상태:");
  console.log(`  dispute.resolved = ${d.resolved}`);
  console.log(`  dispute.accepted = ${d.accepted}  (인정 → 스테이크 반환)`);
  console.log(`  user2 스테이크 반환 = +${ethers.formatEther(balAfter - balBefore)} META (op1 투표 실행 순간)`);

  // 3번째 투표는 이미 실행됨 → revert 확인
  try {
    await resolver.connect(op2).voteDispute(marketId, user2.address, true);
    console.log("  op2 투표: (예상외 성공)");
  } catch (e) {
    console.log(`  op2 추가 투표 → 거부됨 (AlreadyExecuted) ✓`);
  }

  console.log(d.resolved && d.accepted ? "\n결과: 투표 흐름 정상 동작 ✓\n" : "\n결과: 이상 ✗\n");
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
