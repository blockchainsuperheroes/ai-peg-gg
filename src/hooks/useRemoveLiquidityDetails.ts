import { useState, useEffect } from 'react'
import { useV1ERC20Contract, useV2Pair } from './useContract'
import { WETH_ADDRESS } from '../constants'

export function usePairBalances(currencyIdA: string, currencyIdB: string, pairedAddress: string, account: string) {
  const ErctokenA = useV1ERC20Contract(currencyIdA === 'PEN' ? WETH_ADDRESS : currencyIdA)
  const ErctokenB = useV1ERC20Contract(currencyIdB === 'PEN' ? WETH_ADDRESS : currencyIdB)
  const pairData = useV2Pair(pairedAddress ?? '')
  const [balances, setBalances] = useState({
    balanceA: null,
    balanceB: null,
    pairTotalSupply: null,
    myPairBalance: null
  })
  useEffect(() => {
    async function fetchBalances() {
      if (!pairedAddress) {
        console.error('Paired address is undefined')
        return
      }
      try {
        const balanceA = await ErctokenA?.balanceOf(pairedAddress)
        const balanceB = await ErctokenB?.balanceOf(pairedAddress)
        const pairTotalSupply = await pairData?.totalSupply()
        const myPairBalance = await pairData?.balanceOf(account)

        setBalances({
          balanceA,
          balanceB,
          pairTotalSupply,
          myPairBalance
        })
      } catch (error) {
        console.error('Error fetching balances:', error)
      }
    }

    fetchBalances()
  }, [ErctokenA, ErctokenB, pairedAddress, pairData, account])

  return balances
}
