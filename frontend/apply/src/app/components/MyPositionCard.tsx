/*
Todo:
- Add logo from model
*/

import styles from '@/styles/mypositioncard.module.css'

type MyPositionCardType = {
  title: string
  termStart: string
  termEnd: string
  applicationId: string
}

type Props = {
  position: MyPositionCardType
}

const MyPositionCard = ({ position }: Props) => {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeading}>
        <h3>{position.title}</h3>
      </div>

      <div className={styles.cardText}>
        <p>
          Term of office: <br />
          {position.termStart} - {position.termEnd}
        </p>
      </div>
    </div>
  )
}

export default MyPositionCard
