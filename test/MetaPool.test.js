import { expect } from "chai";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.connect();

// ============================================================
// 공통 Fixture
// ============================================================

async function deployFixture() {
  const [owner, user1, user2] = await ethers.getSigners();
  const minBet = ethers.parseEther("100");
  const maxBet = ethers.parseEther("100000");
  const feeRate = 200;

  const MetaPool = await ethers.getContractFactory("MetaPool");
  const metaPool = await MetaPool.deploy(owner.address, minBet, maxBet, feeRate);

  const now = await networkHelpers.time.latest();
  const bettingDeadline = now + 86400;
  const resolutionDeadline = now + 172800;

  const question = "Will BTC exceed $100K by end of 2026?";
  const questionKo = "2026년 말까지 BTC가 10만 달러를 돌파할까요?";
  const questionZh = "BTC会在2026年底前突破10万美元吗？";
  const questionJa = "BTCは2026年末までに10万ドルを突破しますか？";
  const category = 0; // Crypto

  return {
    metaPool, owner, user1, user2,
    question, questionKo, questionZh, questionJa,
    category, bettingDeadline, resolutionDeadline,
  };
}

// ============================================================
// 테스트 스위트
// ============================================================

describe("MetaPool", function () {

  // ----------------------------------------------------------
  // 배포 테스트
  // ----------------------------------------------------------
  describe("배포", function () {
    it("올바른 owner가 설정된다", async function () {
      const { metaPool, owner } = await networkHelpers.loadFixture(deployFixture);
      expect(await metaPool.owner()).to.equal(owner.address);
    });

    it("초기 marketCount가 0이다", async function () {
      const { metaPool } = await networkHelpers.loadFixture(deployFixture);
      expect(await metaPool.marketCount()).to.equal(0n);
    });

    it("minBet, maxBet, platformFeeRate 초기값이 올바르다", async function () {
      const { metaPool } = await networkHelpers.loadFixture(deployFixture);
      expect(await metaPool.minBet()).to.equal(ethers.parseEther("100"));
      expect(await metaPool.maxBet()).to.equal(ethers.parseEther("100000"));
      expect(await metaPool.platformFeeRate()).to.equal(200n);
    });
  });

  // ----------------------------------------------------------
  // F-01: createMarket
  // ----------------------------------------------------------
  describe("F-01: createMarket", function () {

    // --------------------------------------------------------
    // 정상 케이스
    // --------------------------------------------------------
    describe("정상 케이스", function () {
      it("관리자가 마켓을 성공적으로 생성한다", async function () {
        const {
          metaPool, question, questionKo, questionZh, questionJa,
          category, bettingDeadline, resolutionDeadline,
        } = await networkHelpers.loadFixture(deployFixture);

        await metaPool.createMarket(
          question, questionKo, questionZh, questionJa,
          category, bettingDeadline, resolutionDeadline,
        );

        expect(await metaPool.marketCount()).to.equal(1n);
      });

      it("생성된 마켓의 모든 필드가 올바르게 저장된다", async function () {
        const {
          metaPool, owner,
          question, questionKo, questionZh, questionJa,
          category, bettingDeadline, resolutionDeadline,
        } = await networkHelpers.loadFixture(deployFixture);

        await metaPool.createMarket(
          question, questionKo, questionZh, questionJa,
          category, bettingDeadline, resolutionDeadline,
        );

        const market = await metaPool.getMarket(1);
        expect(market.id).to.equal(1n);
        expect(market.question).to.equal(question);
        expect(market.questionKo).to.equal(questionKo);
        expect(market.questionZh).to.equal(questionZh);
        expect(market.questionJa).to.equal(questionJa);
        expect(market.category).to.equal(category);
        expect(market.bettingDeadline).to.equal(bettingDeadline);
        expect(market.resolutionDeadline).to.equal(resolutionDeadline);
        expect(market.creator).to.equal(owner.address);
      });

      it("마켓 ID가 1부터 시작한다", async function () {
        const {
          metaPool, question, questionKo, questionZh, questionJa,
          category, bettingDeadline, resolutionDeadline,
        } = await networkHelpers.loadFixture(deployFixture);

        await metaPool.createMarket(
          question, questionKo, questionZh, questionJa,
          category, bettingDeadline, resolutionDeadline,
        );
        const market = await metaPool.getMarket(1);
        expect(market.id).to.equal(1n);
      });

      it("마켓 ID가 순차적으로 증가한다", async function () {
        const {
          metaPool, question, questionKo, questionZh, questionJa,
          bettingDeadline, resolutionDeadline,
        } = await networkHelpers.loadFixture(deployFixture);

        await metaPool.createMarket(
          question, questionKo, questionZh, questionJa,
          0, bettingDeadline, resolutionDeadline,
        );
        await metaPool.createMarket(
          "Second market?", "", "", "",
          1, bettingDeadline, resolutionDeadline,
        );
        await metaPool.createMarket(
          "Third market?", "", "", "",
          2, bettingDeadline, resolutionDeadline,
        );

        expect((await metaPool.getMarket(1)).id).to.equal(1n);
        expect((await metaPool.getMarket(2)).id).to.equal(2n);
        expect((await metaPool.getMarket(3)).id).to.equal(3n);
        expect(await metaPool.marketCount()).to.equal(3n);
      });

      it("MarketCreated 이벤트가 올바른 파라미터로 emit된다", async function () {
        const {
          metaPool, question, questionKo, questionZh, questionJa,
          category, bettingDeadline, resolutionDeadline,
        } = await networkHelpers.loadFixture(deployFixture);

        await expect(
          metaPool.createMarket(
            question, questionKo, questionZh, questionJa,
            category, bettingDeadline, resolutionDeadline,
          )
        ).to.emit(metaPool, "MarketCreated")
          .withArgs(1n, question, category, bettingDeadline, resolutionDeadline);
      });

      it("생성된 마켓의 초기 상태가 Active이다", async function () {
        const {
          metaPool, question, questionKo, questionZh, questionJa,
          category, bettingDeadline, resolutionDeadline,
        } = await networkHelpers.loadFixture(deployFixture);

        await metaPool.createMarket(
          question, questionKo, questionZh, questionJa,
          category, bettingDeadline, resolutionDeadline,
        );
        const market = await metaPool.getMarket(1);
        expect(market.status).to.equal(0);
      });

      it("생성된 마켓의 초기 outcome이 Undecided이다", async function () {
        const {
          metaPool, question, questionKo, questionZh, questionJa,
          category, bettingDeadline, resolutionDeadline,
        } = await networkHelpers.loadFixture(deployFixture);

        await metaPool.createMarket(
          question, questionKo, questionZh, questionJa,
          category, bettingDeadline, resolutionDeadline,
        );
        const market = await metaPool.getMarket(1);
        expect(market.outcome).to.equal(0);
      });

      it("생성된 마켓의 초기 풀이 모두 0이다", async function () {
        const {
          metaPool, question, questionKo, questionZh, questionJa,
          category, bettingDeadline, resolutionDeadline,
        } = await networkHelpers.loadFixture(deployFixture);

        await metaPool.createMarket(
          question, questionKo, questionZh, questionJa,
          category, bettingDeadline, resolutionDeadline,
        );
        const market = await metaPool.getMarket(1);
        expect(market.yesPool).to.equal(0n);
        expect(market.noPool).to.equal(0n);
        expect(market.yesCount).to.equal(0n);
        expect(market.noCount).to.equal(0n);
      });

      it("다국어 질문이 빈 문자열이어도 생성된다", async function () {
        const {
          metaPool, question, category, bettingDeadline, resolutionDeadline,
        } = await networkHelpers.loadFixture(deployFixture);

        await metaPool.createMarket(
          question, "", "", "",
          category, bettingDeadline, resolutionDeadline,
        );

        const market = await metaPool.getMarket(1);
        expect(market.questionKo).to.equal("");
        expect(market.questionZh).to.equal("");
        expect(market.questionJa).to.equal("");
      });

      it("모든 카테고리(0~5)로 마켓을 생성할 수 있다", async function () {
        const {
          metaPool, question, questionKo, questionZh, questionJa,
          bettingDeadline, resolutionDeadline,
        } = await networkHelpers.loadFixture(deployFixture);

        for (let cat = 0; cat <= 5; cat++) {
          await metaPool.createMarket(
            question, questionKo, questionZh, questionJa,
            cat, bettingDeadline, resolutionDeadline,
          );
        }

        // marketCount 기준으로 상대적 ID 검증
        expect(await metaPool.marketCount()).to.equal(6n);
        for (let cat = 0; cat <= 5; cat++) {
          const market = await metaPool.getMarket(cat + 1);
          expect(market.category).to.equal(cat);
        }
      });

      it("반환된 marketId가 marketCount와 일치한다", async function () {
        const {
          metaPool, question, questionKo, questionZh, questionJa,
          category, bettingDeadline, resolutionDeadline,
        } = await networkHelpers.loadFixture(deployFixture);

        const returnedId = await metaPool.createMarket.staticCall(
          question, questionKo, questionZh, questionJa,
          category, bettingDeadline, resolutionDeadline,
        );
        expect(returnedId).to.equal(1n);

        await metaPool.createMarket(
          question, questionKo, questionZh, questionJa,
          category, bettingDeadline, resolutionDeadline,
        );
        expect(await metaPool.marketCount()).to.equal(1n);
      });
    });

    // --------------------------------------------------------
    // 실패 케이스
    // --------------------------------------------------------
    describe("실패 케이스", function () {
      it("비관리자가 생성하면 OwnableUnauthorizedAccount로 revert된다", async function () {
        const {
          metaPool, user1,
          question, questionKo, questionZh, questionJa,
          category, bettingDeadline, resolutionDeadline,
        } = await networkHelpers.loadFixture(deployFixture);

        await expect(
          metaPool.connect(user1).createMarket(
            question, questionKo, questionZh, questionJa,
            category, bettingDeadline, resolutionDeadline,
          )
        ).to.be.revertedWithCustomError(metaPool, "OwnableUnauthorizedAccount")
          .withArgs(user1.address);
      });

      it("영어 질문이 빈 문자열이면 EmptyQuestion으로 revert된다", async function () {
        const {
          metaPool, questionKo, questionZh, questionJa,
          category, bettingDeadline, resolutionDeadline,
        } = await networkHelpers.loadFixture(deployFixture);

        await expect(
          metaPool.createMarket(
            "", questionKo, questionZh, questionJa,
            category, bettingDeadline, resolutionDeadline,
          )
        ).to.be.revertedWithCustomError(metaPool, "EmptyQuestion");
      });

      it("bettingDeadline이 현재 시간 이하이면 InvalidDeadline으로 revert된다", async function () {
        const {
          metaPool, question, questionKo, questionZh, questionJa,
          category, resolutionDeadline,
        } = await networkHelpers.loadFixture(deployFixture);

        const now = await networkHelpers.time.latest();

        await expect(
          metaPool.createMarket(
            question, questionKo, questionZh, questionJa,
            category, now - 100, resolutionDeadline,
          )
        ).to.be.revertedWithCustomError(metaPool, "InvalidDeadline");

        await expect(
          metaPool.createMarket(
            question, questionKo, questionZh, questionJa,
            category, now, resolutionDeadline,
          )
        ).to.be.revertedWithCustomError(metaPool, "InvalidDeadline");
      });

      it("resolutionDeadline이 bettingDeadline 이하이면 InvalidDeadline으로 revert된다", async function () {
        const {
          metaPool, question, questionKo, questionZh, questionJa,
          category, bettingDeadline,
        } = await networkHelpers.loadFixture(deployFixture);

        await expect(
          metaPool.createMarket(
            question, questionKo, questionZh, questionJa,
            category, bettingDeadline, bettingDeadline,
          )
        ).to.be.revertedWithCustomError(metaPool, "InvalidDeadline");

        await expect(
          metaPool.createMarket(
            question, questionKo, questionZh, questionJa,
            category, bettingDeadline, bettingDeadline - 1,
          )
        ).to.be.revertedWithCustomError(metaPool, "InvalidDeadline");
      });
    });

    // --------------------------------------------------------
    // 경계값 테스트
    // --------------------------------------------------------
    describe("경계값", function () {
      it("bettingDeadline이 현재 시간+1초일 때 성공한다", async function () {
        const {
          metaPool, question, questionKo, questionZh, questionJa, category,
        } = await networkHelpers.loadFixture(deployFixture);

        const now = await networkHelpers.time.latest();
        const minDeadline = now + 2;         // +2초: 트랜잭션 처리 중 block.timestamp 증가 대응
        const resDeadline = minDeadline + 1;

        await metaPool.createMarket(
          question, questionKo, questionZh, questionJa,
          category, minDeadline, resDeadline,
        );

        expect(await metaPool.marketCount()).to.equal(1n);
      });

      it("resolutionDeadline이 bettingDeadline+1초일 때 성공한다", async function () {
        const {
          metaPool, question, questionKo, questionZh, questionJa,
          category, bettingDeadline,
        } = await networkHelpers.loadFixture(deployFixture);

        const resDeadline = bettingDeadline + 1;

        await metaPool.createMarket(
          question, questionKo, questionZh, questionJa,
          category, bettingDeadline, resDeadline,
        );

        expect(await metaPool.marketCount()).to.equal(1n);
      });

      it("매우 긴 질문 텍스트로 마켓을 생성할 수 있다", async function () {
        const {
          metaPool, questionKo, questionZh, questionJa,
          category, bettingDeadline, resolutionDeadline,
        } = await networkHelpers.loadFixture(deployFixture);

        const longQuestion = "A".repeat(1000);

        await metaPool.createMarket(
          longQuestion, questionKo, questionZh, questionJa,
          category, bettingDeadline, resolutionDeadline,
        );

        const market = await metaPool.getMarket(1);
        expect(market.question).to.equal(longQuestion);
      });
    });

    // --------------------------------------------------------
    // getMarket view 함수
    // --------------------------------------------------------
    describe("getMarket view 함수", function () {
      it("존재하는 마켓 ID로 조회하면 올바른 Market struct를 반환한다", async function () {
        const {
          metaPool, owner,
          question, questionKo, questionZh, questionJa,
          category, bettingDeadline, resolutionDeadline,
        } = await networkHelpers.loadFixture(deployFixture);

        await metaPool.createMarket(
          question, questionKo, questionZh, questionJa,
          category, bettingDeadline, resolutionDeadline,
        );

        const market = await metaPool.getMarket(1);
        expect(market.id).to.equal(1n);
        expect(market.question).to.equal(question);
        expect(market.questionKo).to.equal(questionKo);
        expect(market.questionZh).to.equal(questionZh);
        expect(market.questionJa).to.equal(questionJa);
        expect(market.category).to.equal(category);
        expect(market.bettingDeadline).to.equal(bettingDeadline);
        expect(market.resolutionDeadline).to.equal(resolutionDeadline);
        expect(market.status).to.equal(0);
        expect(market.outcome).to.equal(0);
        expect(market.creator).to.equal(owner.address);
      });

      it("존재하지 않는 마켓 ID로 조회하면 모든 필드가 기본값인 struct를 반환한다", async function () {
        const { metaPool } = await networkHelpers.loadFixture(deployFixture);

        const market = await metaPool.getMarket(999);
        expect(market.id).to.equal(0n);
        expect(market.question).to.equal("");
        expect(market.yesPool).to.equal(0n);
        expect(market.noPool).to.equal(0n);
      });

      it("id가 0인 struct 반환으로 마켓 미존재를 판별할 수 있다", async function () {
        const { metaPool } = await networkHelpers.loadFixture(deployFixture);

        const market = await metaPool.getMarket(0);
        expect(market.id).to.equal(0n);
      });
    });
  });

  // ----------------------------------------------------------
  // 통합 테스트
  // ----------------------------------------------------------
  describe("통합 테스트", function () {
    it("마켓 생성 후 조회하면 생성 파라미터와 결과가 완전히 일치한다", async function () {
      const {
        metaPool, owner,
        question, questionKo, questionZh, questionJa,
        category, bettingDeadline, resolutionDeadline,
      } = await networkHelpers.loadFixture(deployFixture);

      await metaPool.createMarket(
        question, questionKo, questionZh, questionJa,
        category, bettingDeadline, resolutionDeadline,
      );

      const market = await metaPool.getMarket(1);
      expect(market.id).to.equal(1n);
      expect(market.question).to.equal(question);
      expect(market.questionKo).to.equal(questionKo);
      expect(market.questionZh).to.equal(questionZh);
      expect(market.questionJa).to.equal(questionJa);
      expect(market.category).to.equal(category);
      expect(market.bettingDeadline).to.equal(bettingDeadline);
      expect(market.resolutionDeadline).to.equal(resolutionDeadline);
      expect(market.status).to.equal(0);
      expect(market.outcome).to.equal(0);
      expect(market.yesPool).to.equal(0n);
      expect(market.noPool).to.equal(0n);
      expect(market.yesCount).to.equal(0n);
      expect(market.noCount).to.equal(0n);
      expect(market.creator).to.equal(owner.address);
    });

    it("5개 마켓 생성 후 각 마켓을 개별 조회하면 데이터가 올바르다", async function () {
      const {
        metaPool, questionKo, questionZh, questionJa,
        bettingDeadline, resolutionDeadline,
      } = await networkHelpers.loadFixture(deployFixture);

      const markets = [
        { q: "Market 1?", cat: 0 },
        { q: "Market 2?", cat: 1 },
        { q: "Market 3?", cat: 2 },
        { q: "Market 4?", cat: 3 },
        { q: "Market 5?", cat: 4 },
      ];

      for (const m of markets) {
        await metaPool.createMarket(
          m.q, questionKo, questionZh, questionJa,
          m.cat, bettingDeadline, resolutionDeadline,
        );
      }

      expect(await metaPool.marketCount()).to.equal(5n);

      for (let i = 1; i <= 5; i++) {
        const market = await metaPool.getMarket(i);
        expect(market.id).to.equal(BigInt(i));
        expect(market.question).to.equal(markets[i - 1].q);
        expect(market.category).to.equal(markets[i - 1].cat);
      }
    });

    it("마켓 3개 생성 후 marketCount가 3이다", async function () {
      const {
        metaPool, question, questionKo, questionZh, questionJa,
        bettingDeadline, resolutionDeadline,
      } = await networkHelpers.loadFixture(deployFixture);

      await metaPool.createMarket(
        question, questionKo, questionZh, questionJa,
        0, bettingDeadline, resolutionDeadline,
      );
      await metaPool.createMarket(
        "Second?", "", "", "",
        1, bettingDeadline, resolutionDeadline,
      );
      await metaPool.createMarket(
        "Third?", "", "", "",
        2, bettingDeadline, resolutionDeadline,
      );

      expect(await metaPool.marketCount()).to.equal(3n);
    });
  });
});
