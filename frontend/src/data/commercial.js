import {
  emptyConsumerLead,
  dispositionGroups,
  loanFields,
  personalFields,
} from './consumerDurable'
import {
  retailEditableFields,
  retailNonPaymentReasons,
  retailPaymentModes,
} from './retail'


export const emptyCommercialLead = {
  ...emptyConsumerLead,
  portfolio: 'Commercial',
}

export const commercialConfig = {
  key: 'commercial',
  label: 'Commercial',
  shortLabel: 'Commercial',
  emptyLead: emptyCommercialLead,
  personalFields,
  loanFields,
  dispositionGroups,
  paymentModes: retailPaymentModes,
  reasonOptions: retailNonPaymentReasons,
  reasonLabel: 'Non Payment Reason',
  editableFields: retailEditableFields,
}
