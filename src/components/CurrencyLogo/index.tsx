import { Currency, ETHER, Token } from '../../dist'
import React, { useMemo } from 'react'
import styled from 'styled-components'

import EthereumLogo from '../../assets/images/PentagonLogo.png'
import CpenLogo from '../../assets/images/cpentester.png'
import FiveLogo from '../../assets/images/five.png'
import BarkLogo from '../../assets/images/bark.png'
import USDTLogo from '../../assets/images/USDT.png'
import useHttpLocations from '../../hooks/useHttpLocations'
import { WrappedTokenInfo } from '../../state/lists/hooks'
import Logo from '../Logo'

const getTokenLogoURL = (address: string) =>
  `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${address}/logo.png`

const StyledEthereumLogo = styled.img<{ size: string }>`
  width: ${({ size }) => size};
  height: ${({ size }) => size};
  box-shadow: 0px 6px 10px rgba(0, 0, 0, 0.075);
  border-radius: 24px;
`

const StyledLogo = styled(Logo)<{ size: string }>`
  width: ${({ size }) => size};
  height: ${({ size }) => size};
`

export default function CurrencyLogo({
  currency,
  size = '24px',
  style
}: {
  currency?: Currency
  size?: string
  style?: React.CSSProperties
}) {
  const uriLocations = useHttpLocations(currency instanceof WrappedTokenInfo ? currency.logoURI : undefined)
  const srcs: string[] = useMemo(() => {
    if (currency === ETHER) return []

    if (currency instanceof Token) {
      if (currency instanceof WrappedTokenInfo) {
        return [...uriLocations, getTokenLogoURL(currency.address)]
      }

      return [getTokenLogoURL(currency.address)]
    }
    return []
  }, [currency, uriLocations])

  if (currency === ETHER) {
    return <StyledEthereumLogo src={EthereumLogo} size={size} style={style} />
  }
  if (currency.symbol === 'cPENTESTER') {
    return <StyledEthereumLogo src={CpenLogo} size={size} style={style} />
  }
  if (currency.symbol === 'FIVE') {
    return <StyledEthereumLogo src={FiveLogo} size={size} style={style} />
  }
  if (currency.symbol === 'BARK') {
    return <StyledEthereumLogo src={BarkLogo} size={size} style={style} />
  }
  if (currency.symbol === 'USDT') {
    return <StyledEthereumLogo src={USDTLogo} size={size} style={style} />
  }
  return <StyledLogo size={size} srcs={srcs} alt={`${currency?.symbol ?? 'token'} logo`} style={style} />
}
