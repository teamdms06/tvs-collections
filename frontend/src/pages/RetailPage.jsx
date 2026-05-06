import { retailConfig } from '../data/retail'
import LeadFeedbackPage from './LeadFeedbackPage'

export default function RetailPage({ onLogout, user }) {
  return <LeadFeedbackPage config={retailConfig} onLogout={onLogout} user={user} />
}
