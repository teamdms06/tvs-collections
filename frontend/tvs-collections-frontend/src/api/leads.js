import { productConfigs } from '../data/formConfigs'

let uploadedLeadsByProduct = Object.fromEntries(
  Object.entries(productConfigs).map(([key, config]) => [key, [...config.sampleLeads]]),
)

const wait = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms))

export async function uploadConsumerLeads(file, productKey = 'consumer') {
  await wait()

  // Replace this mock with:
  // const formData = new FormData()
  // formData.append('file', file)
  // return fetch(`/api/${productKey}/leads/upload`, { method: 'POST', body: formData })
  uploadedLeadsByProduct[productKey] = [...productConfigs[productKey].sampleLeads]

  return {
    fileName: file.name,
    imported: uploadedLeadsByProduct[productKey].length,
  }
}

export async function searchConsumerLeads(query, productKey = 'consumer') {
  await wait()

  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return []
  }

  // Replace this mock with:
  // return fetch(`/api/${productKey}/leads/search?q=${encodeURIComponent(query)}`)
  return uploadedLeadsByProduct[productKey].filter(
    (lead) =>
      lead.mobileNumber.includes(normalizedQuery) ||
      lead.agreementNumber.toLowerCase().includes(normalizedQuery),
  )
}

export async function getConsumerLeadById(leadId, productKey = 'consumer') {
  await wait(250)

  // Replace this mock with:
  // return fetch(`/api/${productKey}/leads/${leadId}`)
  const lead = uploadedLeadsByProduct[productKey].find((item) => item.id === leadId)

  if (!lead) {
    throw new Error('Lead record was not found')
  }

  return lead
}

export async function saveConsumerFeedback(leadId, feedback, productKey = 'consumer') {
  await wait(300)

  // Replace this mock with:
  // return fetch(`/api/${productKey}/leads/${leadId}/feedback`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(feedback),
  // })
  uploadedLeadsByProduct[productKey] = uploadedLeadsByProduct[productKey].map((lead) =>
    lead.id === leadId
      ? {
          ...lead,
          history: [
            {
              date: new Date().toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              }),
              disposition: feedback.subDisposition || feedback.disposition || 'Draft',
              remark: feedback.remark || 'Feedback saved.',
            },
            ...lead.history,
          ],
        }
      : lead,
  )

  return { saved: true }
}
