'use client'
import styles from '@/styles/navbar.module.css'
import Link from 'next/link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { useIsLoggedIn } from '@/utils/auth';

const Navbar = () => {
  const [lang, setLang] = useState('sv')
  const pathname = usePathname()
  const { isLoggedIn, loading } = useIsLoggedIn()

  console.log('Current pathname:', pathname)
  console.log('Is logged in:', isLoggedIn, 'Loading:', loading)
  
  return (
    <div className={styles.navbar}>
      <a className={styles.logo} href="https://www.utn.se" target="_blank" rel="noopener noreferrer">
        <img src='/utn_standard_bla.png' alt='Logo' width={200} />
      </a>
      <div className={styles.navbarItems}>
        <Link
          href='/'
          className={`${styles.navLink} ${
            pathname === '/' ? styles.activeNavLink : ''
          }`}
        >
          Home
        </Link>
        <Link
          href='/about'
          className={`${styles.navLink} ${
            pathname === '/about' ? styles.activeNavLink : ''
          }`}
        >
          About
        </Link>
        {isLoggedIn ? (
          <Link
            href='/account'
            className={`${styles.navLink} ${
              pathname === '/account' ? styles.activeNavLink : ''
            }`}
          >
            Account
          </Link>
        ) :
          <Link
            href='/login'
            className={`${styles.navLink} ${
              pathname === '/login' ? styles.activeNavLink : ''
            }`}
          >
            Log in
          </Link>
        }

        <div className={styles.langBtns}>
          <button
            onClick={() => setLang('sv')}
            className={`${styles.svLang} smallButton ${
              lang === 'sv' ? styles.activeBtn : ''
            }`}
          >
            Svenska
          </button>
          <button
            onClick={() => setLang('en')}
            className={`${styles.engLang} smallButton ${
              lang === 'en' ? styles.activeBtn : ''
            }`}
          >
            English
          </button>
        </div>
      </div>
    </div>
  )
}

export default Navbar
