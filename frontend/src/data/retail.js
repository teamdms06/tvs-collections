import {
  dispositionGroups,
  emptyConsumerLead,
  loanFields,
  paymentModes,
  personalFields,
  reasonOptions,
} from "./consumerDurable";

export const emptyRetailLead = {
  ...emptyConsumerLead,
  portfolio: "Retail",
};

export const retailPaymentModes = paymentModes;

export const retailNonPaymentReasons = reasonOptions;

export const retailBouncingReasons = [
  "/ dealer/financer",
  "Crop Loss",
  "Heavy Rainfall",
  "Earthquake",
  "Floods",
  "Landslides",
  "Pandemic",
  "Drought Areas",
  "Cyclone",
  "Market Closed",
  "Crop yet not sold",
  "DOWN IN MARKET",
  "personal Number",
  "Received but not",
  "legal team",
  "Buckets",
  "Election",
  "Strike",
  "settlement done",
  "Settlement",
  "NOC Received",
  "dealer / FCE /",
  "ownership",
  "But Vehicle Not",
  "Don't be disclose",
];

export const retailEditableFields = [
  {
    label: "PTP/Paid/Pickup Amount",
    name: "amount",
    placeholder: "Minimum 500",
    type: "number",
    required: true,
    help: "Digit. Enter amount collected, promised, or assigned for pickup.",
  },
  {
    label: "PTP/Paid/Pickup Date",
    name: "actionDate",
    type: "date",
    required: true,
    help: "Calendar. Capture the promised, paid, or pickup date.",
  },
  {
    label: "Transaction/Receipt No",
    name: "receiptNo",
    placeholder: "Receipt or transaction ID",
    help: "Alpha-numeric. Required when payment is already made.",
  },
  {
    label: "Pickup Time",
    name: "pickupTime",
    type: "time",
    help: "Time. Required when pickup is selected.",
  },
  {
    label: "Pickup Address",
    name: "pickupAddress",
    placeholder: "Pickup address",
    help: "Text. Required when pickup is selected.",
  },
  {
    label: "Paid to whom (Name)",
    name: "paidToName",
    placeholder: "Collector or executive name",
    help: "Name. Capture who received or will receive payment.",
  },
  {
    label: "Paid to whom (Contact no)",
    name: "paidToContact",
    placeholder: "10 digit contact number",
    minLength: 10,
    maxLength: 10,
    help: "10 digit. Capture collector or executive contact number.",
  },
  {
    label: "Paid Showroom",
    name: "paidShowroom",
    placeholder: "Dealer or showroom point",
    help: "Name. Required when dealer/showroom payment mode is selected.",
  },
  {
    label: "Call Back Date",
    name: "callBackDate",
    type: "date",
    help: "Calendar. Required for callback disposition.",
  },
  {
    label: "Call Back Time",
    name: "callBackTime",
    type: "time",
    help: "Time. Capture callback time in AM/PM equivalent.",
  },
  {
    label: "Non Payment Reason",
    name: "nonPaymentReason",
    options: retailNonPaymentReasons,
    help: "Dropdown. Retail non-payment reason.",
  },
  {
    label: "Alternate Mobile Number",
    name: "alternateMobile",
    placeholder: "10 digit alternate number",
    maxLength: 10,
    help: "Enter 10 digit alternate number, or 0 when not provided.",
  },
  {
    label: "Remark",
    name: "remark",
    placeholder: "Type agent remarks",
    required: true,
    help: "Text. Mandatory for every disposition.",
  },
];

export const retailConfig = {
  key: "retail",
  label: "Retail",
  shortLabel: "Retail",
  emptyLead: emptyRetailLead,
  personalFields,
  loanFields,
  dispositionGroups,
  paymentModes: retailPaymentModes,
  reasonOptions: retailNonPaymentReasons,
  reasonLabel: "Non Payment Reason",
  editableFields: retailEditableFields,
};
