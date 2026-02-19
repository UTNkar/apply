'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { positionAPI } from '@/lib/api'
import type { Position } from '@/lib/types'
import ApplicationForm from '@/components/ApplicationForm'

export default function ApplyPage() {
  const params = useParams()
  const positionId = Number(params.id)

  const [position, setPosition] = useState<Position | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    positionAPI.getById(positionId)
      .then(data => {
        setPosition(data)
        setError(null)
      })
      .catch(() => setError('Failed to load position'))
      .finally(() => setLoading(false))
  }, [positionId])

  if (loading) return <div className="pageContainer"><p>Loading...</p></div>
  if (error) return <div className="pageContainer"><p style={{ color: 'red' }}>{error}</p></div>
  if (!position) return <div className="pageContainer"><p>Position not found</p></div>

  return <ApplicationForm mode="create" position={position} />
}
