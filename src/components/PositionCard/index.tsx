/* eslint-disable @typescript-eslint/no-unused-vars */
import { JSBI, Pair, Percent } from '../../../src/dist'
import { darken } from 'polished'
import React, { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp } from 'react-feather'
import { Link } from 'react-router-dom'
import { Text } from 'rebass'
import styled from 'styled-components'
import { useTotalSupply } from '../../data/TotalSupply'

import { useActiveWeb3React } from '../../hooks'
import { currencyId } from '../../utils/currencyId'
import { unwrappedToken } from '../../utils/wrappedCurrency'
import { ButtonSecondary } from '../Button'

import Card, { GreyCard } from '../Card'
import { AutoColumn } from '../Column'
import DoubleCurrencyLogo from '../DoubleLogo'
import { AutoRow, RowBetween, RowFixed } from '../Row'
import { Dots } from '../swap/styleds'
import { ethers } from 'ethers'
import { getFirst10Characters } from '../../utils/Formattedvalue'
export const FixedHeightRow = styled(RowBetween)`
  height: 24px;
`

export const HoverCard = styled(Card)`
  border: 1px solid ${({ theme }) => theme.bg2};
  :hover {
    border: 1px solid ${({ theme }) => darken(0.06, theme.bg2)};
  }
`

interface PositionCardProps {
  pair: Pair
  showUnwrapped?: boolean
  border?: string
  balanceA?: JSBI | null
  balanceB?: JSBI | null
  myPairBalance?: JSBI | null
  pairTotalSupply?: JSBI | null
}

export function MinimalPositionCard({
  pair,
  showUnwrapped = false,
  border,
  balanceA,
  balanceB,
  pairTotalSupply,
  myPairBalance
}: PositionCardProps) {
  const currency0 = showUnwrapped ? pair.token0 : unwrappedToken(pair.token0)
  const currency1 = showUnwrapped ? pair.token1 : unwrappedToken(pair.token1)
  const [showMore, setShowMore] = useState(false)
  const [liquidityValue, setLiquidityvalue] = useState('')
  const [balances, setBalances] = useState({
    balanceABNFloat: null,
    balanceBBNFloat: null
  })

  useEffect(() => {
    try {
      if (!myPairBalance || !pairTotalSupply) {
        throw new Error('myPairBalance or pairTotalSupply are null or undefined')
      }

      const myPairBalanceBN = ethers.BigNumber.from(myPairBalance)
      const pairTotalSupplyBN = ethers.BigNumber.from(pairTotalSupply)

      const myPairBalanceFloat = parseFloat(ethers.utils.formatUnits(myPairBalanceBN, 18)) // Assuming 18 decimals
      const pairTotalSupplyFloat = parseFloat(ethers.utils.formatUnits(pairTotalSupplyBN, 18)) // Assuming 18 decimals

      const myLiquidity = (myPairBalanceFloat / pairTotalSupplyFloat) * 100
      setLiquidityvalue(myLiquidity.toString())
    } catch (error) {
      console.error('Error processing values:', error.message)
    }
  }, [pairTotalSupply, myPairBalance])

  useEffect(() => {
    try {
      if (!balanceA || !balanceB) {
        throw new Error('balanceA or balanceB are null or undefined')
      }
      const balanceABN = ethers.BigNumber.from(balanceA)
      const balanceBBN = ethers.BigNumber.from(balanceB)

      // Convert BigNumber to a floating-point number (assuming 18 decimals)
      const balanceABNFloat = parseFloat(ethers.utils.formatUnits(balanceABN, 18))
      const balanceBBNFloat = parseFloat(ethers.utils.formatUnits(balanceBBN, 18))

      const liquidityValueFloat = parseFloat(liquidityValue) / 100
      setBalances({
        balanceABNFloat: balanceABNFloat * liquidityValueFloat,
        balanceBBNFloat: balanceBBNFloat * liquidityValueFloat
      })

      // Log results
    } catch (error) {
      console.error('Error processing values:', error.message)
    }
  }, [balanceA, balanceB, liquidityValue])

  return (
    <>
      {/* {userPoolBalance && ( */}
      <GreyCard border={border}>
        <AutoColumn gap="12px">
          <FixedHeightRow>
            <RowFixed>
              <Text fontWeight={500} fontSize={16}>
                Your position
              </Text>
            </RowFixed>
          </FixedHeightRow>
          <FixedHeightRow onClick={() => setShowMore(!showMore)}>
            <RowFixed>
              <DoubleCurrencyLogo currency0={currency0} currency1={currency1} margin={true} size={20} />
              <Text fontWeight={500} fontSize={20}>
                {currency0.symbol}/{currency1.symbol}
              </Text>
            </RowFixed>
            <RowFixed>
              <Text fontWeight={500} fontSize={20}>
                {liquidityValue ? `${getFirst10Characters(liquidityValue)}%` : '-'}
              </Text>
            </RowFixed>
          </FixedHeightRow>
          <AutoColumn gap="4px">
            <FixedHeightRow>
              <Text color="#888D9B" fontSize={16} fontWeight={500}>
                {currency0.symbol}:
              </Text>
              {balances.balanceABNFloat !== null ? (
                <RowFixed>
                  <Text color="#888D9B" fontSize={16} fontWeight={500} marginLeft={'6px'}>
                    {getFirst10Characters(balances.balanceABNFloat)}
                  </Text>
                </RowFixed>
              ) : (
                '-'
              )}
            </FixedHeightRow>
            <FixedHeightRow>
              <Text color="#888D9B" fontSize={16} fontWeight={500}>
                {currency1.symbol}:
              </Text>
              {balances.balanceBBNFloat !== null ? (
                <RowFixed>
                  <Text color="#888D9B" fontSize={16} fontWeight={500} marginLeft={'6px'}>
                    {getFirst10Characters(balances.balanceBBNFloat)}
                  </Text>
                </RowFixed>
              ) : (
                '-'
              )}
            </FixedHeightRow>
          </AutoColumn>
        </AutoColumn>
      </GreyCard>
      {/* )} */}
    </>
  )
}

export default function FullPositionCard({ pair, border }: PositionCardProps) {
  const { account } = useActiveWeb3React()

  const currency0 = unwrappedToken(pair.token0)
  const currency1 = unwrappedToken(pair.token1)

  const [showMore, setShowMore] = useState(false)

  return (
    <HoverCard border={border}>
      <AutoColumn gap="12px">
        <FixedHeightRow onClick={() => setShowMore(!showMore)} style={{ cursor: 'pointer' }}>
          <RowFixed>
            <DoubleCurrencyLogo currency0={currency0} currency1={currency1} margin={true} size={20} />
            <Text fontWeight={500} fontSize={20}>
              {!currency0 || !currency1 ? <Dots>Loading</Dots> : `${currency0.symbol}/${currency1.symbol}`}
            </Text>
          </RowFixed>
          <RowFixed>
            {showMore ? (
              <ChevronUp size="20" style={{ marginLeft: '10px' }} />
            ) : (
              <ChevronDown size="20" style={{ marginLeft: '10px' }} />
            )}
          </RowFixed>
        </FixedHeightRow>
        {showMore && (
          <AutoColumn gap="8px">
            <RowBetween marginTop="10px">
              <ButtonSecondary as={Link} to={`/add/${currencyId(currency0)}/${currencyId(currency1)}`} width="48%">
                Add
              </ButtonSecondary>
              <ButtonSecondary as={Link} width="48%" to={`/remove/${currencyId(currency0)}/${currencyId(currency1)}`}>
                Remove
              </ButtonSecondary>
            </RowBetween>
          </AutoColumn>
        )}
      </AutoColumn>
    </HoverCard>
  )
}
