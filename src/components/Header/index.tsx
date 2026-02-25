/* eslint-disable @typescript-eslint/no-unused-vars */
import { ChainId } from '../../dist'
import React, { useEffect } from 'react'
import { isMobile } from 'react-device-detect'
import { Text } from 'rebass'
import ResponsiveLogo from '../../assets/images/ResponsiveLogo.png'
import styled from 'styled-components'
import { useActiveWeb3React } from '../../hooks'
import { useIsDarkMode } from '../../state/user/hooks'
import { useETHBalances } from '../../state/wallet/hooks'

import { YellowCard } from '../Card'

import Row, { RowBetween } from '../Row'
import Web3Status from '../Web3Status'
import { updateUserDarkMode } from '../../state/user/actions'
import { useDispatch } from 'react-redux'
import { AppDispatch } from '../../state'
import { ethers } from 'ethers'

const HeaderFrame = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-direction: column;
  width: 100%;
  top: 0;
  position: absolute;
  z-index: 2;
  ${({ theme }) => theme.mediaWidth.upToExtraSmall`
    padding: 12px 0 0 0;
    width: calc(100%);
    position: relative;
  `};
`

const HeaderElement = styled.div`
  display: flex;
  align-items: center;
`

const Title = styled.a`
  display: flex;
  align-items: center;
  pointer-events: auto;

  :hover {
    cursor: pointer;
  }
`

const AccountElement = styled.div<{ active: boolean }>`
  display: flex;
  flex-direction: row;
  align-items: center;
  background-color: ${({ theme, active }) => (!active ? theme.bg1 : theme.bg3)};
  border-radius: 12px;
  white-space: nowrap;
  width: 100%;

  :focus {
    border: 1px solid blue;
  }
`

const TestnetWrapper = styled.div`
  white-space: nowrap;
  width: fit-content;
  margin-left: 10px;
  pointer-events: auto;
`

const NetworkCard = styled(YellowCard)`
  width: fit-content;
  margin-right: 10px;
  border-radius: 12px;
  padding: 8px 12px;
`

const UniIcon = styled.div`
  transition: transform 0.3s ease;
  display: block;

  :hover {
    transform: rotate(-5deg);
  }
  ${({ theme }) => theme.mediaWidth.upToSmall`
    img { 
      width: 4.5rem;
      display: none;
    }
  `};
`
const MobileUniIcon = styled.div`
  transition: transform 0.3s ease;
  display: none;

  :hover {
    transform: rotate(-5deg);
  }
  @media (max-width: 600px) {
    width: 4.5rem;
    display: block !important;
  }
`

const HeaderControls = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;

  ${({ theme }) => theme.mediaWidth.upToSmall`
    flex-direction: column;
    align-items: flex-end;
  `};
`

const BalanceText = styled(Text)`
  ${({ theme }) => theme.mediaWidth.upToExtraSmall`
    display: none;
  `};
`

const NETWORK_LABELS: { [chainId in ChainId]: string | null } = {
  [ChainId.MAINNET]: null,
  [ChainId.RINKEBY]: 'Rinkeby',
  [ChainId.ROPSTEN]: 'Ropsten',
  [ChainId.GÖRLI]: 'Görli',
  [ChainId.KOVAN]: 'Kovan',
  [ChainId.PEN]: 'PEN'
}

export default function Header() {
  const { account, chainId } = useActiveWeb3React()
  const dispatch = useDispatch<AppDispatch>()

  const userEthBalance = useETHBalances([account])[account]
  const darkMode = useIsDarkMode()
  useEffect(() => {
    if (!darkMode) {
      dispatch(updateUserDarkMode({ userDarkMode: true }))
    } else {
      dispatch(updateUserDarkMode({ userDarkMode: darkMode }))
    }

    async function switchToPentagon() {
      const PENTAGON_NETWORK_ID = 555555
      if (window.ethereum && chainId !== PENTAGON_NETWORK_ID) {
        try {
          const provider = new ethers.providers.Web3Provider(window.ethereum)
          await provider.send('eth_requestAccounts', [])
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${PENTAGON_NETWORK_ID.toString(16)}` }]
          })

          window.ethereum.on('chainChanged', () => {
            window.location.reload() // Reload the page to reset the state
          })
        } catch (error) {
          console.error('Failed to switch to the Pentagon network:', error)
        }
      }
    }

    if (!!account) switchToPentagon()
  }, [account, chainId, darkMode, dispatch])

  return (
    <HeaderFrame>
      <RowBetween style={{ alignItems: 'flex-start' }} padding="1rem 1rem 0 1rem">
        <HeaderElement>
          <Title href=".">
            <UniIcon>
              <img
                src="https://pentagon.games/_next/image?url=%2Fassets%2Fimages%2Fheader-text-pentagon-games.png&w=3840&q=75"
                alt="logo"
                style={{ height: '100%', width: '220px' }}
              />
            </UniIcon>
            <MobileUniIcon>
              <img src={ResponsiveLogo} alt="logo" style={{ height: '100%', width: '70px' }} />
            </MobileUniIcon>
          </Title>
        </HeaderElement>
        <HeaderControls>
          <HeaderElement>
            <TestnetWrapper></TestnetWrapper>
            <AccountElement active={!!account} style={{ pointerEvents: 'auto' }}>
              {account && userEthBalance ? (
                <BalanceText style={{ flexShrink: 0 }} pl="0.75rem" pr="0.5rem" fontWeight={500}>
                  {userEthBalance?.toSignificant(4)} PEN
                </BalanceText>
              ) : null}
              <Web3Status />
            </AccountElement>
          </HeaderElement>
          {/* <HeaderElementWrap>
            <VersionSwitch />
            <Settings />
            <Menu />
          </HeaderElementWrap> */}
        </HeaderControls>
      </RowBetween>
    </HeaderFrame>
  )
}
