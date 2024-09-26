import "@stdlib/deploy";

const DEFAULT_TON_VALUE: Int = ton("0.01");

const DEFAULT_AIRDROP_AMOUNT: Int = 1; // TODO: change this later

message TokenNotification {
    queryId: Int as uint64;
    amount: Int as coins;
    forwardPayload: Slice as remaining;
}

message TokenTransfer {
    queryId: Int as uint64;
    amount: Int as coins;
    destination: Address;
    responseDestination: Address?;
    customPayload: Cell?;
    forwardTonAmount: Int as coins;
    forwardPayload: Slice as remaining;
}

message Withdraw {
    queryId: Int as uint64;
    amount: Int as coins;
}

contract MoewbieAirdrop with Deployable {
  owner: Address;
  amount: Int;
  jettonAddress: Address;

  init(newJettonAddress: Address) {
    self.owner = sender();
    self.jettonAddress = newJettonAddress;
    self.amount = 0;
  }

  receive(msg: TokenNotification) {
    require(self.amount >= DEFAULT_AIRDROP_AMOUNT, "Insufficient balance in vault");

    let sender: Address = sender();
    if (sender == self.owner) { // admin send to vault
        self.amount = self.amount + msg.amount;
        return;
    }
 
    self.amount = self.amount - DEFAULT_AIRDROP_AMOUNT;
    let body: Cell = TokenTransfer{
        queryId: 0,
        amount: DEFAULT_AIRDROP_AMOUNT,
        destination: sender,
        responseDestination: myAddress(),
        customPayload: null,
        forwardTonAmount: DEFAULT_TON_VALUE,
        forwardPayload: emptySlice()
        }.toCell();
    send(SendParameters{
        to: self.jettonAddress,
        bounce: true,
        value: 0,
        mode: SendRemainingValue + SendIgnoreErrors,
        body: body
    });
  }

  receive(msg: Withdraw) {
    let sender: Address = sender();
    require(sender == self.owner, "Only admin is allowed to withdraw");
    require(self.amount > 0, "Insufficient balance in vault");

    if (sender == self.owner) { // admin send to vault
        self.amount = self.amount + msg.amount;
        return;
    }
 
    self.amount = 0;
    let body: Cell = TokenTransfer{
        queryId: 0,
        amount: self.amount,
        destination: sender,
        responseDestination: myAddress(),
        customPayload: null,
        forwardTonAmount: DEFAULT_TON_VALUE,
        forwardPayload: emptySlice()
        }.toCell();
    send(SendParameters{
        to: self.jettonAddress,
        bounce: true,
        value: 0,
        mode: SendRemainingValue + SendIgnoreErrors,
        body: body
    });
  } 
  
  get fun balance(): Int {
    return self.amount;
  }
}