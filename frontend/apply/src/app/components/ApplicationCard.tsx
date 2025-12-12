'use client'
import { useRouter } from 'next/navigation'
import styles from '@/styles/applicationcard.module.css'

type ApplicationType = {
  title: string
  status: string
  termStart: string
  termEnd: string
  applicationId: string
}

type Props = {
  application: ApplicationType
}

const ApplicationCard = ({ application }: Props) => {
  const router = useRouter()

  return (
    <div className={styles.card}>
      <div className={styles.cardHeading}>
        <h3>{application.title}</h3>
      </div>

      <div className={styles.cardText}>
        <p>Status: {application.status}</p>

        <p>
          Term of office: <br />
          {application.termStart} - {application.termEnd}
        </p>
      </div>

      <div className={styles.cardButton}>
        <button
          className={'smallButton'}
          onClick={() => router.push(`/application/${application.applicationId}`)}
        >
          View Application
        </button>
      </div>
    </div>
  )
}

export default ApplicationCard
