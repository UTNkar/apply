'use client'
import { useState } from 'react'
import styles from './page.module.css'
import ApplicationCard from '@/components/ApplicationCard'
import MyPositionCard from '@/components/MyPositionCard'
import OpenPositionCard from './components/OpenPositionCard'

export default function Home() {
  const [activeTab, setActiveTab] = useState('Open Positions')

  const applicationDummies = [
    {
      title: 'Head of the Pub Crew 2025',
      status: 'Appointed',
      termStart: 'September 2025',
      termEnd: 'June 2026',
      applicationId: '1',
    },
    {
      title: 'Binär 2024',
      status: 'Appointed',
      termStart: 'September 2024',
      termEnd: 'June 2025',
      applicationId: '2',
    },
    {
      title: 'Buddy 2023',
      status: 'Appointed',
      termStart: 'September 2023',
      termEnd: 'June 2024',
      applicationId: '3',
    },
  ]

  const openPositionDummies = [
    {
      title: 'Open position 2025',
      termStart: 'September 2025',
      termEnd: 'June 2026',
      applicationId: '4',
      roleDescription: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      comments: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      deadline: '2025-04-12',
      group: 'Engineering, Computer Science, and Foundation Year Reception',
    },
    {
      title: 'Cafe Host 2025',
      termStart: 'September 2024',
      termEnd: 'June 2025',
      applicationId: '5',
      roleDescription: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      comments: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      deadline: '2025-04-12',
      group: 'Cafe Group',
    },
  ]

  const myPositionDummies = [
    {
      title: 'My position 2025',
      termStart: 'September 2025',
      termEnd: 'June 2026',
      applicationId: '4',
    },
    {
      title: 'Another My position 2025',
      termStart: 'September 2024',
      termEnd: 'June 2025',
      applicationId: '5',
    },
  ]

  return (
    <div className='pageContainer'>
      <h2>{activeTab}</h2>

      <div className={styles.buttonsContainer}>
        <button
          className={`button ${
            activeTab === 'Open Positions' ? 'activeButton' : ''
          }`}
          onClick={() => setActiveTab('Open Positions')}
        >
          Open Positions
        </button>

        <button
          className={`button ${
            activeTab === 'My Applications' ? 'activeButton' : ''
          }`}
          onClick={() => setActiveTab('My Applications')}
        >
          My Applications
        </button>

        <button
          className={`button ${
            activeTab === 'My Positions' ? 'activeButton' : ''
          }`}
          onClick={() => setActiveTab('My Positions')}
        >
          My Positions
        </button>
      </div>

      {activeTab === 'My Applications' && (
        <div className={styles.myApplicationsContainer}>
          {applicationDummies.map((application, index) => (
            <ApplicationCard key={index} application={application} />
          ))}
        </div>
      )}

      {activeTab === 'Open Positions' && (
        <div className={styles.openPositionsContainer}>
          {openPositionDummies.map((position, index) => (
            <OpenPositionCard key={index} position={position} />
          ))}
        </div>
      )}

      {activeTab === 'My Positions' && (
        <div className={styles.myPositionsContainer}>
          {myPositionDummies.map((position, index) => (
            <MyPositionCard key={index} position={position} />
          ))}
        </div>
      )}
    </div>
  )
}
