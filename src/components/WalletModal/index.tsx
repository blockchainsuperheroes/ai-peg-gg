import React, { useState, useEffect } from 'react'
import ReactGA from 'react-ga'
import styled from 'styled-components'
import { isMobile } from 'react-device-detect'
import { UnsupportedChainIdError, useWeb3React } from '@web3-react/core'
import usePrevious from '../../hooks/usePrevious'
import { useWalletModalOpen, useWalletModalToggle } from '../../state/application/hooks'

import Modal from '../Modal'
import AccountDetails from '../AccountDetails'
import PendingView from './PendingView'
import Option from './Option'
import { SUPPORTED_WALLETS } from '../../constants'
import MetamaskIcon from '../../assets/images/metamask.png'
import { ReactComponent as Close } from '../../assets/images/x.svg'
import { injected, fortmatic } from '../../connectors'
import { OVERLAY_READY } from '../../connectors/Fortmatic'
import { WalletConnectConnector } from '@web3-react/walletconnect-connector'
import { ethers } from 'ethers'

const CloseIcon = styled.div`
  position: absolute;
  right: 1rem;
  top: 14px;
  &:hover {
    cursor: pointer;
    opacity: 0.6;
  }
`

const CloseColor = styled(Close)`
  path {
    stroke: ${({ theme }) => theme.text4};
  }
`

const Wrapper = styled.div`
  ${({ theme }) => theme.flexColumnNoWrap}
  margin: 0;
  padding: 0;
  width: 100%;
`

const HeaderRow = styled.div`
  ${({ theme }) => theme.flexRowNoWrap};
  padding: 1rem 1rem;
  font-weight: 500;
  color: ${props => (props.color === 'blue' ? ({ theme }) => theme.primary1 : 'inherit')};
  ${({ theme }) => theme.mediaWidth.upToMedium`
    padding: 1rem;
  `};
`

const ContentWrapper = styled.div`
  background-color: ${({ theme }) => theme.bg2};
  padding: 2rem;
  border-bottom-left-radius: 20px;
  border-bottom-right-radius: 20px;

  ${({ theme }) => theme.mediaWidth.upToMedium`padding: 1rem`};
`

const UpperSection = styled.div`
  position: relative;

  h5 {
    margin: 0;
    margin-bottom: 0.5rem;
    font-size: 1rem;
    font-weight: 400;
  }

  h5:last-child {
    margin-bottom: 0px;
  }

  h4 {
    margin-top: 0;
    font-weight: 500;
  }
`

const OptionGrid = styled.div`
  display: grid;
  grid-gap: 10px;
  ${({ theme }) => theme.mediaWidth.upToMedium`
    grid-template-columns: 1fr;
    grid-gap: 10px;
  `};
`

const HoverText = styled.div`
  :hover {
    cursor: pointer;
  }
`

const WALLET_VIEWS = {
  OPTIONS: 'options',
  OPTIONS_SECONDARY: 'options_secondary',
  ACCOUNT: 'account',
  PENDING: 'pending'
}

export default function WalletModal({
  pendingTransactions,
  confirmedTransactions,
  ENSName
}: {
  pendingTransactions: string[] // hashes of pending
  confirmedTransactions: string[] // hashes of confirmed
  ENSName?: string
}) {
  // important that these are destructed from the account-specific web3-react context
  const { active, account, connector, activate, error } = useWeb3React()

  const [walletView, setWalletView] = useState(WALLET_VIEWS.ACCOUNT)

  const [pendingWallet, setPendingWallet] = useState()

  const [pendingError, setPendingError] = useState<boolean>()

  const walletModalOpen = useWalletModalOpen()
  const toggleWalletModal = useWalletModalToggle()

  const previousAccount = usePrevious(account)

  // close on connection, when logged out before
  useEffect(() => {
    if (account && !previousAccount && walletModalOpen) {
      toggleWalletModal()
    }
  }, [account, previousAccount, toggleWalletModal, walletModalOpen])

  // always reset to account view
  useEffect(() => {
    if (walletModalOpen) {
      setPendingError(false)
      setWalletView(WALLET_VIEWS.ACCOUNT)
    }
  }, [walletModalOpen])

  // close modal when a connection is successful
  const activePrevious = usePrevious(active)
  const connectorPrevious = usePrevious(connector)
  useEffect(() => {
    if (walletModalOpen && ((active && !activePrevious) || (connector && connector !== connectorPrevious && !error))) {
      setWalletView(WALLET_VIEWS.ACCOUNT)
    }
  }, [setWalletView, active, error, connector, walletModalOpen, activePrevious, connectorPrevious])

  const tryActivation = async connector => {
    let name = ''
    Object.keys(SUPPORTED_WALLETS).map(key => {
      if (connector === SUPPORTED_WALLETS[key].connector) {
        return (name = SUPPORTED_WALLETS[key].name)
      }
      return true
    })
    // log selected wallet
    ReactGA.event({
      category: 'Wallet',
      action: 'Change Wallet',
      label: name
    })
    setPendingWallet(connector) // set wallet for pending view
    setWalletView(WALLET_VIEWS.PENDING)

    // if the connector is walletconnect and the user has already tried to connect, manually reset the connector
    if (connector instanceof WalletConnectConnector && connector.walletConnectProvider?.wc?.uri) {
      connector.walletConnectProvider = undefined
    }

    activate(connector, undefined, true).catch(error => {
      if (error instanceof UnsupportedChainIdError) {
        activate(connector) // a little janky...can't use setError because the connector isn't set
      } else {
        setPendingError(true)
      }
    })
  }

  // close wallet modal if fortmatic modal is active
  useEffect(() => {
    fortmatic.on(OVERLAY_READY, () => {
      toggleWalletModal()
    })
  }, [toggleWalletModal])
  async function switchToPentagon() {
    const PENTAGON_NETWORK_ID = 555555
    const PENTAGON_NETWORK_PARAMS = {
      chainId: `0x${PENTAGON_NETWORK_ID.toString(16)}`,
      chainName: 'Pentagon Network',
      nativeCurrency: {
        name: 'Pentagon Testnet',
        symbol: 'PEN',
        decimals: 18
      },
      rpcUrls: ['https://rpc-testnet.pentagon.games'],
      blockExplorerUrls: ['https://explorer-testnet.pentagon.games']
    }
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      await provider.send('eth_requestAccounts', [])

      // Check if the Pentagon network is already added
      const currentNetwork = await provider.getNetwork()
      if (currentNetwork.chainId !== PENTAGON_NETWORK_ID) {
        try {
          // Try to switch to the Pentagon network
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: PENTAGON_NETWORK_PARAMS.chainId }]
          })
        } catch (switchError) {
          // This error means the chain is not added to MetaMask
          if (isMobile) {
            const errorCode = switchError.data?.originalError?.code
            if (errorCode && errorCode === 4902) {
              try {
                // Try to add the Pentagon network to MetaMask
                await window.ethereum.request({
                  method: 'wallet_addEthereumChain',
                  params: [PENTAGON_NETWORK_PARAMS]
                })
              } catch (addError) {
                console.error('Failed to add the Pentagon network:', addError)
              }
            }
          } else {
            if (switchError.code === 4902) {
              try {
                // Try to add the Pentagon network to MetaMask
                await window.ethereum.request({
                  method: 'wallet_addEthereumChain',
                  params: [PENTAGON_NETWORK_PARAMS]
                })
              } catch (addError) {
                console.error('Failed to add the Pentagon network:', addError)
              }
            } else {
              console.error('Failed to switch to the Pentagon network:', switchError)
            }
          }
        }

        const updatedProvider = new ethers.providers.Web3Provider(window.ethereum)
        const updatedNetwork = await updatedProvider.getNetwork()
        window.ethereum.on('chainChanged', () => {
          window.location.reload() // Reload the page to reset the state
        })
        console.log(`Connected to network: ${updatedNetwork.name} with chain ID: ${updatedNetwork.chainId}`)
      }
    } catch (error) {
      console.error('Failed to connect to the Pentagon network:', error)
    }
  }
  // get wallets user can switch too, depending on device/browser
  function getOptions() {
    const isMetamask = window.ethereum && window.ethereum.isMetaMask

    // Return only the MetaMask option on mobile
    if (isMobile) {
      const metaMaskOption = SUPPORTED_WALLETS['METAMASK']
      return (
        <Option
          onClick={async () => {
            if (!isMetamask) {
              const deepLink = `https://metamask.app.link/dapp/${window.location.hostname}/`
              window.open(deepLink)
              return
            }
            try {
              await window.ethereum.request({ method: 'eth_requestAccounts' })
              switchToPentagon()
              tryActivation(metaMaskOption.connector)
            } catch (error) {
              console.error('User denied account access or error:', error)
            }
          }}
          id={`connect-metamask`}
          key={`connect-metamask`}
          active={metaMaskOption.connector && metaMaskOption.connector === connector}
          color={metaMaskOption.color}
          link={metaMaskOption.href}
          header={metaMaskOption.name}
          subheader={null}
          icon={require('../../assets/images/' + metaMaskOption.iconName)}
        />
      )
    }

    // Return other options for non-mobile
    return Object.keys(SUPPORTED_WALLETS).map(key => {
      const option = SUPPORTED_WALLETS[key]

      // Overwrite injected when needed for non-mobile
      if (option.connector === injected) {
        if (!(window.web3 || window.ethereum)) {
          return option.name === 'MetaMask' ? (
            <Option
              id={`connect-${key}`}
              key={key}
              color={'#E8831D'}
              header={'Install Metamask'}
              subheader={null}
              link={'https://metamask.io/'}
              icon={MetamaskIcon}
            />
          ) : null
        } else if (option.name === 'MetaMask' && !isMetamask) {
          return null
        } else if (option.name === 'Injected' && isMetamask) {
          return null
        }
      }

      return (
        !option.mobileOnly && (
          <Option
            id={`connect-${key}`}
            onClick={() => {
              option.connector === connector
                ? setWalletView(WALLET_VIEWS.ACCOUNT)
                : !option.href && tryActivation(option.connector)
            }}
            key={key}
            active={option.connector === connector}
            color={option.color}
            link={option.href}
            header={option.name}
            subheader={null}
            icon={require('../../assets/images/' + option.iconName)}
          />
        )
      )
    })
  }

  function getModalContent() {
    if (error) {
      switchToPentagon()
      return (
        <UpperSection>
          <CloseIcon onClick={toggleWalletModal}>
            <CloseColor />
          </CloseIcon>
          <HeaderRow>{error instanceof UnsupportedChainIdError ? 'Wrong Network' : 'Error connecting'}</HeaderRow>
          <ContentWrapper>
            {error instanceof UnsupportedChainIdError ? (
              <h5>Please connect to the appropriate pentagon network.</h5>
            ) : (
              'Error connecting. Try refreshing the page.'
            )}
          </ContentWrapper>
        </UpperSection>
      )
    }
    if (account && walletView === WALLET_VIEWS.ACCOUNT) {
      return (
        <AccountDetails
          toggleWalletModal={toggleWalletModal}
          pendingTransactions={pendingTransactions}
          confirmedTransactions={confirmedTransactions}
          ENSName={ENSName}
          openOptions={() => setWalletView(WALLET_VIEWS.OPTIONS)}
        />
      )
    }
    return (
      <UpperSection>
        <CloseIcon onClick={toggleWalletModal}>
          <CloseColor />
        </CloseIcon>
        {walletView !== WALLET_VIEWS.ACCOUNT ? (
          <HeaderRow color="blue">
            <HoverText
              onClick={() => {
                setPendingError(false)
                setWalletView(WALLET_VIEWS.ACCOUNT)
              }}
            >
              Back
            </HoverText>
          </HeaderRow>
        ) : (
          <HeaderRow>
            <HoverText>Connect to a wallet</HoverText>
          </HeaderRow>
        )}
        <ContentWrapper>
          {walletView === WALLET_VIEWS.PENDING ? (
            <PendingView
              connector={pendingWallet}
              error={pendingError}
              setPendingError={setPendingError}
              tryActivation={tryActivation}
            />
          ) : (
            <OptionGrid>{getOptions()}</OptionGrid>
          )}
        </ContentWrapper>
      </UpperSection>
    )
  }

  return (
    <Modal isOpen={walletModalOpen} onDismiss={toggleWalletModal} minHeight={null} maxHeight={90}>
      <Wrapper>{getModalContent()}</Wrapper>
    </Modal>
  )
}
