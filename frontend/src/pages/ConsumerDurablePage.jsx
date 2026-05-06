import { consumerDurableConfig } from '../data/consumerDurable'
import LeadFeedbackPage from './LeadFeedbackPage'

export default function ConsumerDurablePage({ onLogout, user }) {
  return <LeadFeedbackPage config={consumerDurableConfig} onLogout={onLogout} user={user} />
}
