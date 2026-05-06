import { commercialConfig } from '../data/commercial'
import LeadFeedbackPage from './LeadFeedbackPage'

export default function CommercialPage({ onLogout, user }) {
  return <LeadFeedbackPage config={commercialConfig} onLogout={onLogout} user={user} />
}
