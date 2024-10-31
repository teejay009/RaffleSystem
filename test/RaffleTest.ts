import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("Raffle Test", function () {

    const entryFeeInEthers = hre.ethers.parseUnits('1', 18)
    console.log(entryFeeInEthers)

   
    async function deployRaffleSystem(){

    
        const [acctOne, acctTwo, acctThree, acctFour, acctFive] = await hre.ethers.getSigners();

        const RaffleSystem = await hre.ethers.getContractFactory("RaffleSystem");
        const raffleSystem = await RaffleSystem.deploy(entryFeeInEthers);

        return {raffleSystem, acctOne, acctTwo, acctThree, acctFour, acctFive}
    }

    const entryAmount = hre.ethers.parseEther('1.0')



    describe("Deployment", () => {
        it("should check if it deployed", async function () {
            const {raffleSystem} = await loadFixture(deployRaffleSystem);


            expect(await raffleSystem).not.equal(undefined);
        });
        it("Nft contract should also be deployed", async function () {
            const {raffleSystem} = await loadFixture(deployRaffleSystem);

           
            expect(await raffleSystem.nftContract).not.equal(undefined);
        });
    })


    describe("Raffle Entry", () => {
        it("should enter a raffle", async function () {
            const {raffleSystem, acctOne} = await loadFixture(deployRaffleSystem);

      

            await raffleSystem.connect(acctOne).enterRaffle({value: entryAmount});


            expect(await raffleSystem.raffleOpen()).to.be.equal(true)

        });

        it("should allow mutiple Entry", async function () {
            const {raffleSystem, acctOne, acctTwo, acctThree} = await loadFixture(deployRaffleSystem);

   

            await raffleSystem.connect(acctOne).enterRaffle({value: entryAmount});
            await raffleSystem.connect(acctTwo).enterRaffle({value: entryAmount});
            await raffleSystem.connect(acctThree).enterRaffle({value: entryAmount});


            const numberOfEntries = await raffleSystem.getParticipants()
            expect(numberOfEntries.length).to.equal(3);

        });

        it("should pass an event of Raffle Entered", async function () {
            const {raffleSystem, acctOne} = await loadFixture(deployRaffleSystem);

            
           
            await expect(  raffleSystem.connect(acctOne).enterRaffle({value: entryAmount})).to.be.emit(raffleSystem, "RaffleEntered").withArgs(acctOne.address);

        });

        
        it("should revert if entry amount is not correct", async function () {
            const {raffleSystem, acctOne} = await loadFixture(deployRaffleSystem);

          
            const wrongEntryAmount = hre.ethers.parseEther('2.0')
           
            await expect(
                raffleSystem.connect(acctOne).enterRaffle({ value: wrongEntryAmount })
            ).to.be.revertedWith("Incorrect entry fee");

        });






    })

    describe("Raffle Close and Winner Assigned ", () => {
           
        it("Raffle round should have a winner", async function () {
            const {raffleSystem, acctOne, acctTwo, acctThree, acctFour} = await loadFixture(deployRaffleSystem);

            await raffleSystem.connect(acctOne).enterRaffle({value: entryAmount});
            await raffleSystem.connect(acctTwo).enterRaffle({value: entryAmount});
            await raffleSystem.connect(acctThree).enterRaffle({value: entryAmount});

            await raffleSystem.closeRaffleAndSelectWinner()

          
            const result = await raffleSystem.getRaffleResult(0); 
            
            expect(result[0]).to.be.oneOf([acctOne.address, acctThree.address, acctTwo.address])

        });

        it("should disribute refunds after Raffle close", async function () {
            const {raffleSystem, acctOne, acctTwo, acctThree, acctFour} = await loadFixture(deployRaffleSystem);

            await raffleSystem.connect(acctOne).enterRaffle({value: entryAmount});
            await raffleSystem.connect(acctTwo).enterRaffle({value: entryAmount});
            await raffleSystem.connect(acctThree).enterRaffle({value: entryAmount});

            await raffleSystem.closeRaffleAndSelectWinner()
          

          
            const result = await raffleSystem.getRaffleResult(0); 
            
            const winner = result[0]
            const nonWinners = [acctOne, acctTwo, acctThree].filter(
                (acct) => acct.address !== winner
            );

      
        await Promise.all(
            nonWinners.map(async (participant) => {
                const refund = await raffleSystem.refunds(participant.address);
                expect(refund).to.equal(entryAmount);
            })
        );



        });



        it("raffle should close", async function () {
            const {raffleSystem, acctOne, acctTwo, acctThree, acctFour} = await loadFixture(deployRaffleSystem);

            await raffleSystem.connect(acctOne).enterRaffle({value: entryAmount});
            await raffleSystem.connect(acctTwo).enterRaffle({value: entryAmount});
            await raffleSystem.connect(acctThree).enterRaffle({value: entryAmount});

            await raffleSystem.closeRaffleAndSelectWinner()
            

          
            expect(await raffleSystem.raffleOpen()).to.be.equal(false)



        });


        it("should emit WinnerSelected", async function () {
            const {raffleSystem, acctOne, acctTwo, acctThree, acctFour} = await loadFixture(deployRaffleSystem);

            await raffleSystem.connect(acctOne).enterRaffle({value: entryAmount});
            await raffleSystem.connect(acctTwo).enterRaffle({value: entryAmount});
            await raffleSystem.connect(acctThree).enterRaffle({value: entryAmount});
          
            
          
            await expect( 
                await raffleSystem.closeRaffleAndSelectWinner()
            ).to.emit(raffleSystem, "WinnerSelected").withArgs(await raffleSystem.getRaffleResult(0).then(result => result[0]))



        });
    })

    describe("Raffle withdrawal ", () => {
        it("should transfer eth to participants withdrawing", async function () {
            const {raffleSystem, acctOne, acctTwo, acctThree} = await loadFixture(deployRaffleSystem);

   

            await raffleSystem.connect(acctOne).enterRaffle({value: entryAmount});
            await raffleSystem.connect(acctTwo).enterRaffle({value: entryAmount});
            await raffleSystem.connect(acctThree).enterRaffle({value: entryAmount});

            await raffleSystem.closeRaffleAndSelectWinner()
          

          
            const result = await raffleSystem.getRaffleResult(0); 
            
            const winner = result[0]
            const nonWinners = [acctOne, acctTwo, acctThree].filter(
                (acct) => acct.address !== winner
            );

            const firstNonWinner = nonWinners[0]

            const oldBalanceOfFirstNoneWinner = await hre.ethers.provider.getBalance(firstNonWinner.address);

            await raffleSystem.connect(firstNonWinner).withdrawRefund()

            const newBalanceOfFirstNoneWinner = await hre.ethers.provider.getBalance(firstNonWinner.address);

            expect(newBalanceOfFirstNoneWinner).to.be.greaterThan(oldBalanceOfFirstNoneWinner)

        });

        it("should revert if withdraw is called by non refundable address", async function () {
            const {raffleSystem, acctOne, acctTwo, acctThree} = await loadFixture(deployRaffleSystem);

   

            await raffleSystem.connect(acctOne).enterRaffle({value: entryAmount});
            await raffleSystem.connect(acctTwo).enterRaffle({value: entryAmount});
            await raffleSystem.connect(acctThree).enterRaffle({value: entryAmount});

            await raffleSystem.closeRaffleAndSelectWinner()
          

          
            const result = await raffleSystem.getRaffleResult(0); 
            
            const winner = result[0]
            const winnerAcct = [acctOne, acctTwo, acctThree].filter(
                (acct) => acct.address === winner
            );

            const champ = winnerAcct[0]

           
           await expect(raffleSystem.connect(champ).withdrawRefund()).to.be.revertedWith("No refund available")

        });

        it("should emit RefundIssued", async function () {
            const {raffleSystem, acctOne, acctTwo, acctThree, acctFour} = await loadFixture(deployRaffleSystem);

            await raffleSystem.connect(acctOne).enterRaffle({value: entryAmount});
            await raffleSystem.connect(acctTwo).enterRaffle({value: entryAmount});
            await raffleSystem.connect(acctThree).enterRaffle({value: entryAmount});

            await raffleSystem.closeRaffleAndSelectWinner()
          

          
            const result = await raffleSystem.getRaffleResult(0); 
            
            const winner = result[0]
            const nonWinners = [acctOne, acctTwo, acctThree].filter(
                (acct) => acct.address !== winner
            );

            const firstNonWinner = nonWinners[0]  
          
            await expect( 
                await raffleSystem.connect(firstNonWinner).withdrawRefund()
            ).to.emit(raffleSystem, "RefundIssued").withArgs(firstNonWinner, entryAmount)



        });


        

    })

    it("should get all participants in recent raffle", async function () {
        const {raffleSystem, acctOne, acctTwo, acctThree, acctFour} = await loadFixture(deployRaffleSystem);

        await raffleSystem.connect(acctOne).enterRaffle({value: entryAmount});
        await raffleSystem.connect(acctTwo).enterRaffle({value: entryAmount});
        await raffleSystem.connect(acctThree).enterRaffle({value: entryAmount});

        await raffleSystem.closeRaffleAndSelectWinner()
      

      
         
        
        
        
      
     expect( 
        await raffleSystem.getParticipants()).to.be.deep.equal([acctOne.address, acctTwo.address, acctThree.address])



    });
    
       

   


})