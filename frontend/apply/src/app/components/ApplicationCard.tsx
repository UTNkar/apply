/*
Todo:
- Navigate to application page when button is clicked, with the id of the application
- Add logo from model
*/

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
        <button className={'smallButton'}>View Application</button>
      </div>
    </div>
  )
}

export default ApplicationCard
