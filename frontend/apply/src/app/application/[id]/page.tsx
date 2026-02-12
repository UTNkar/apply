'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { applicationAPI } from '@/lib/api'
import type { Application } from '@/lib/types'
import ApplicationForm from '@/components/ApplicationForm'

export default function ApplicationPage() {
  const params = useParams()
  const applicationId = Number(params.id)

  const [application, setApplication] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    applicationAPI.getById(applicationId)
      .then(data => {
        setApplication(data)
        setError(null)
      })
      .catch(() => setError('Failed to load application'))
      .finally(() => setLoading(false))
  }, [applicationId])

  if (loading) return <div className="pageContainer"><p>Loading...</p></div>
  if (error && !application) return <div className="pageContainer"><p style={{ color: 'red' }}>{error}</p></div>
  if (!application) return <div className="pageContainer"><p>Application not found</p></div>

  return (
    <ApplicationForm
      mode="edit"
      position={application.position_details}
      existingApplication={application}
    />
  )
}
