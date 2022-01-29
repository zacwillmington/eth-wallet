pragma solidity 0.6.0;
pragma experimental ABIEncoderV2;

contract Wallet {
    address[] public approvers;
    uint public quorum;

    struct Transfer {
        uint id;
        uint amount;
        address payable to;
        uint approvals;
        bool sent;
    }
    Transfer[] public transfers;
    mapping(address => mapping(uint => bool)) approvals;

    constructor(address[] memory _approvers, uint _quorum) public {
        approvers = _approvers;
        quorum = _quorum;
    }

    function getTransfers() external view returns(Transfer[] memory) {
        return transfers;
    }

    function approveTransfer(uint id) external onlyApprover() {
        require(transfers[id].sent == false, 'Transfer already completed');
        require(approvals[msg.sender][id] == false, 'Transfer already approved');

        approvals[msg.sender][id] = true;
        transfers[id].approvals++;

        if (transfers[id].approvals >= quorum) {
            transfers[id].sent = true;
            address payable to = transfers[id].to;
            to.transfer(transfers[id].amount);

        }
    }

    function createTransfer(address payable to, uint amount) external onlyApprover() {
        transfers.push(Transfer({
            id: transfers.length,
            amount: amount,
            to: to,
            approvals: 0,
            sent: false
        }));
    }

    function getApprovers() external view returns(address[] memory){
        return approvers;
    }

    receive() external payable {}

    modifier onlyApprover() {
        bool allowed = false;

        for (uint i = 0; i < approvers.length; i++) {
            if (approvers[i] == msg.sender) {
                allowed = true;
            }
        }

        require(allowed, 'Unpermitted sender address');
        _;
    } 
}
