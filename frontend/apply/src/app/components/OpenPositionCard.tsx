/*
Todo:
- Navigate to application page when button is clicked, with the id of the application
- Add logo from model
*/

import styles from '@/styles/openpositioncard.module.css'
import { useState } from 'react'

type OpenPositionType = {
  title: string
  termStart: string
  termEnd: string
  applicationId: string
  roleDescription: string
  comments: string
  deadline: string
  group: string
}

type Props = {
  position: OpenPositionType
}

const OpenPositionCard = ({ position }: Props) => {
  const [showInfo, setShowInfo] = useState(false)

  return (
    <div className={styles.cardContainer}>
      <div
        className={styles.cardInitial}
        onClick={() => setShowInfo(!showInfo)}
      >
        <div className={styles.cardLogo}></div>

        <div className={styles.cardLeftSection}>
          <h3>{position.title}</h3>
          {position.group}
        </div>

        <div className={styles.cardRightSection}>
          <h4>Deadline: {position.deadline}</h4>

          <button className={'smallButton'}>Apply</button>
        </div>
      </div>

      <div
        className={`${styles.hiddenSection} ${
          showInfo ? styles.hiddenSectionVisible : ''
        }`}
      >
        <p>
          Term of Office: {position.termStart} - {position.termEnd}
        </p>
        <p>
          Role Description: <br />
          {position.roleDescription}
        </p>

        <p>
          Comments for this year: <br />
          {position.comments}
        </p>
      </div>
    </div>
  )
}

export default OpenPositionCard
