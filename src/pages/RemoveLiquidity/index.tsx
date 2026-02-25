import { Currency, currencyEquals, Percent, WETH } from '../../../src/dist'
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ArrowDown, Plus } from 'react-feather'
import { RouteComponentProps } from 'react-router'
import { Text } from 'rebass'
import { ThemeContext } from 'styled-components'
import { ButtonPrimary, ButtonLight, ButtonError, ButtonConfirmed } from '../../components/Button'
import { LightCard } from '../../components/Card'
import { AutoColumn, ColumnCenter } from '../../components/Column'
import TransactionConfirmationModal, { ConfirmationModalContent } from '../../components/TransactionConfirmationModal'
import CurrencyInputPanel from '../../components/CurrencyInputPanel'
import DoubleCurrencyLogo from '../../components/DoubleLogo'
import { AddRemoveTabs } from '../../components/NavigationTabs'
import { MinimalPositionCard } from '../../components/PositionCard'
import Row, { RowBetween, RowFixed } from '../../components/Row'

import Slider from '../../components/Slider'
import CurrencyLogo from '../../components/CurrencyLogo'
import { ROUTER_ADDRESS, WETH_ADDRESS } from '../../constants'
import { useActiveWeb3React } from '../../hooks'
import { useCurrency } from '../../hooks/Tokens'
import { usePairBalances } from '../../hooks/useRemoveLiquidityDetails'

import { useV1FactoryContract, useV2Pair } from '../../hooks/useContract'

import { TYPE } from '../../theme'
import { getRouterContract } from '../../utils'
import { currencyId } from '../../utils/currencyId'
import useDebouncedChangeHandler from '../../utils/useDebouncedChangeHandler'
import { wrappedCurrency } from '../../utils/wrappedCurrency'
import AppBody from '../AppBody'
import { MaxButton, Wrapper } from '../Pool/styleds'
import { useApproveCallback, ApprovalState } from '../../hooks/useApproveCallback'
import { Dots } from '../../components/swap/styleds'
import { useBurnActionHandlers } from '../../state/burn/hooks'
import { useDerivedBurnInfo, useBurnState } from '../../state/burn/hooks'
import { Field, typeInput } from '../../state/burn/actions'
import { useWalletModalToggle } from '../../state/application/hooks'
import { useUserDeadline, useUserSlippageTolerance } from '../../state/user/hooks'
import { ethers } from 'ethers'
import { useDispatch } from 'react-redux'
import { AppDispatch } from '../../state'
import { getFirst10Characters } from '../../utils/Formattedvalue'
import { useTransactionAdder } from '../../state/transactions/hooks'
export default function RemoveLiquidity({
  history,
  match: {
    params: { currencyIdA, currencyIdB }
  }
}: RouteComponentProps<{ currencyIdA: string; currencyIdB: string }>) {
  const [currencyA, currencyB] = [useCurrency(currencyIdA) ?? undefined, useCurrency(currencyIdB) ?? undefined]
  const { account, chainId, library } = useActiveWeb3React()
  const [pairedAddress, setPairedAddress] = useState()
  const [isPending, setIsPending] = useState(false)
  const dispatch = useDispatch<AppDispatch>()
  const addTransaction = useTransactionAdder()

  const [balances, setBalances] = useState({
    balanceABNFloat: 0,
    balanceBBNFloat: 0
  })
  // pair contract
  const factory = useV1FactoryContract()
  const [tokenA, tokenB] = useMemo(() => [wrappedCurrency(currencyA, chainId), wrappedCurrency(currencyB, chainId)], [
    currencyA,
    currencyB,
    chainId
  ])
  const theme = useContext(ThemeContext)
  // toggle wallet when disconnected
  const toggleWalletModal = useWalletModalToggle()

  useEffect(() => {
    async function callPair() {
      const address = await factory?.getPair(
        currencyIdA === 'PEN' ? WETH_ADDRESS : currencyIdA,
        currencyIdB === 'PEN' ? WETH_ADDRESS : currencyIdB
      )
      await setPairedAddress(address)
    }
    callPair()
  }, [currencyIdA, currencyIdB, factory])
  const { balanceA, balanceB, pairTotalSupply, myPairBalance } = usePairBalances(
    currencyIdA,
    currencyIdB,
    pairedAddress ?? '',
    account ?? ''
  )
  // burn state
  const { independentField, typedValue } = useBurnState()
  const { pair, parsedAmounts, error } = useDerivedBurnInfo(currencyA ?? undefined, currencyB ?? undefined)
  const { onUserInput: _onUserInput } = useBurnActionHandlers()
  const [liquidityValue, setLiquidityvalue] = useState('')
  const [liquidityPercentage, setLiquidityPercentage] = useState(0)

  const isValid = !error
  useEffect(() => {
    try {
      if (!myPairBalance || !pairTotalSupply) {
        throw new Error('One or both values are null or undefined')
      }

      const myPairBalanceBN = ethers.BigNumber.from(myPairBalance)
      const pairTotalSupplyBN = ethers.BigNumber.from(pairTotalSupply)

      const myPairBalanceFloat = parseFloat(ethers.utils.formatUnits(myPairBalanceBN, 18)) // Assuming 18 decimals
      const pairTotalSupplyFloat = parseFloat(ethers.utils.formatUnits(pairTotalSupplyBN, 18)) // Assuming 18 decimals

      const myLiquidity = (myPairBalanceFloat / pairTotalSupplyFloat) * 100
      setLiquidityPercentage(myLiquidity)
      setLiquidityvalue(myPairBalanceBN.toString())
    } catch (error) {
      console.error('Error ')
    }
  }, [pairTotalSupply, myPairBalance])

  // modal and loading
  const [showConfirm, setShowConfirm] = useState<boolean>(false)
  const [showDetailed, setShowDetailed] = useState<boolean>(false)
  const [isApproved, setIsApproved] = useState<boolean>(true)
  const [attemptingTxn] = useState(false) // clicked confirm
  const [isRemoved, setIsRemoved] = useState(false)
  // txn values
  const [txHash, setTxHash] = useState<string>('')
  const [deadline] = useUserDeadline()
  const [allowedSlippage] = useUserSlippageTolerance()

  const formattedAmounts = {
    [Field.LIQUIDITY_PERCENT]: parsedAmounts[Field.LIQUIDITY_PERCENT].equalTo('0')
      ? '0'
      : parsedAmounts[Field.LIQUIDITY_PERCENT].lessThan(new Percent('1', '100'))
      ? '<1'
      : parsedAmounts[Field.LIQUIDITY_PERCENT].toFixed(0),
    [Field.LIQUIDITY]:
      independentField === Field.LIQUIDITY ? typedValue : parsedAmounts[Field.LIQUIDITY]?.toSignificant(6) ?? '',
    [Field.CURRENCY_A]:
      independentField === Field.CURRENCY_A ? typedValue : parsedAmounts[Field.CURRENCY_A]?.toSignificant(6) ?? '',
    [Field.CURRENCY_B]:
      independentField === Field.CURRENCY_B ? typedValue : parsedAmounts[Field.CURRENCY_B]?.toSignificant(6) ?? ''
  }

  const atMaxAmount = parsedAmounts[Field.LIQUIDITY_PERCENT]?.equalTo(new Percent('1'))
  const approvePaired = useV2Pair(pairedAddress ?? '')
  // allowance handling
  const [signatureData, setSignatureData] = useState<{ v: number; r: string; s: string; deadline: number } | null>(null)
  const [approval, approveCallback] = useApproveCallback(parsedAmounts[Field.LIQUIDITY], ROUTER_ADDRESS)

  useEffect(() => {
    try {
      if (!balanceA || !balanceB) {
        throw new Error('One or both values are null or undefined')
      }
      const balanceABN = ethers.BigNumber.from(balanceA)
      const balanceBBN = ethers.BigNumber.from(balanceB)
      const liquidityValueFloat = liquidityPercentage / 100
      const balanceABNFloat = parseFloat(ethers.utils.formatUnits(balanceABN, 18)) * liquidityValueFloat
      const balanceBBNFloat = parseFloat(ethers.utils.formatUnits(balanceBBN, 18)) * liquidityValueFloat

      const typedValueFloat = parseFloat(typedValue)

      setBalances({
        balanceABNFloat: (balanceABNFloat * typedValueFloat) / 100,
        balanceBBNFloat: (balanceBBNFloat * typedValueFloat) / 100
      })
      // Log results
    } catch (error) {
      console.error('Error processing values:')
    }
  }, [typedValue, balanceA, balanceB, liquidityPercentage])

  async function onAttemptToApprove() {
    try {
      setIsPending(true)
      const approvalTransaction = await approvePaired?.approve(ROUTER_ADDRESS, '1000000000000000000000000000000000000')
      await approvalTransaction.wait()
      addTransaction(approvalTransaction, {
        summary: `Approval Confirmed`
      })
    } catch (error) {
      console.error('Error approving transaction:', error)
    } finally {
      setIsPending(false)
      setIsApproved(false)
    }
  }

  // wrapped onUserInput to clear signatures
  const onUserInput = useCallback(
    (field: Field, typedValue: string) => {
      setSignatureData(null)
      return _onUserInput(field, typedValue)
    },
    [_onUserInput]
  )

  const onLiquidityInput = useCallback((typedValue: string): void => onUserInput(Field.LIQUIDITY, typedValue), [
    onUserInput
  ])
  const onCurrencyAInput = useCallback((typedValue: string): void => onUserInput(Field.CURRENCY_A, typedValue), [
    onUserInput
  ])
  const onCurrencyBInput = useCallback((typedValue: string): void => onUserInput(Field.CURRENCY_B, typedValue), [
    onUserInput
  ])
  // tx sending

  const onDelete = async () => {
    try {
      if (!chainId || !library || !account) throw new Error('missing dependencies')
      setIsRemoved(true)
      const router = getRouterContract(chainId, library, account)
      const deadlineFromNow = Math.ceil(Date.now() / 1000) + deadline

      // Perform the calculation in a safe manner with BigNumber
      const liquidityValueBN = ethers.BigNumber.from(liquidityValue.toString()) // ensure liquidityValue is a BigNumber
      const typedValueBN = ethers.BigNumber.from(typedValue.toString()) // ensure typedValue is a BigNumber

      // Calculate result as a percentage and convert it to BigNumber
      const resultBN = liquidityValueBN.mul(typedValueBN).div(100) // mul and div are safe operations on BigNumber

      // Convert resultBN to the appropriate unit (usually 18 decimals for ERC-20 tokens)
      const resultInWei = ethers.utils.formatUnits(resultBN, 18) // if you want to work with it in decimal format
      const resultInWeiBN = ethers.utils.parseUnits(resultInWei, 18) // if you need it as a BigNumber in smallest unit

      const removeResponse = await router.removeLiquidity(
        currencyIdA === 'PEN' ? WETH_ADDRESS : currencyIdA,
        currencyIdB === 'PEN' ? WETH_ADDRESS : currencyIdB,
        typedValue === '100' ? ethers.utils.parseUnits(liquidityValue, 18) : resultInWeiBN,
        0,
        0,
        account,
        deadlineFromNow
      )

      await removeResponse.wait()
      addTransaction(removeResponse, {
        summary: `${typedValue}% Liquidity Removed`
      })
    } catch (error) {
      console.error('Error removing liquidity:', error)
    } finally {
      dispatch(
        typeInput({
          field: Field.LIQUIDITY_PERCENT,
          typedValue: '0'
        })
      )
      setIsRemoved(false)
      setShowConfirm(false)
    }
  }

  function modalHeader() {
    return (
      <AutoColumn gap={'md'} style={{ marginTop: '20px' }}>
        <RowBetween align="flex-end">
          <Text fontSize={24} fontWeight={500}>
            {balances.balanceABNFloat !== null ? getFirst10Characters(balances.balanceABNFloat) : '-'}
          </Text>
          <RowFixed gap="4px">
            <CurrencyLogo currency={currencyA} size={'24px'} />
            <Text fontSize={24} fontWeight={500} style={{ marginLeft: '10px' }}>
              {currencyA?.symbol}
            </Text>
          </RowFixed>
        </RowBetween>
        <RowFixed>
          <Plus size="16" color={theme.text2} />
        </RowFixed>
        <RowBetween align="flex-end">
          <Text fontSize={24} fontWeight={500}>
            {balances.balanceBBNFloat !== null ? getFirst10Characters(balances.balanceBBNFloat) : '-'}
          </Text>
          <RowFixed gap="4px">
            <CurrencyLogo currency={currencyB} size={'24px'} />
            <Text fontSize={24} fontWeight={500} style={{ marginLeft: '10px' }}>
              {currencyB?.symbol}
            </Text>
          </RowFixed>
        </RowBetween>

        <TYPE.italic fontSize={12} color={theme.text2} textAlign="left" padding={'12px 0 0 0'}>
          {`Output is estimated. If the price changes by more than ${allowedSlippage /
            100}% your transaction will revert.`}
        </TYPE.italic>
      </AutoColumn>
    )
  }

  function modalBottom() {
    return (
      <>
        <RowBetween>
          <Text color={theme.text2} fontWeight={500} fontSize={16}>
            {'UNI ' + currencyA?.symbol + '/' + currencyB?.symbol} Burned
          </Text>
          <RowFixed>
            <DoubleCurrencyLogo currency0={currencyA} currency1={currencyB} margin={true} />
            <Text fontWeight={500} fontSize={16}>
              {parsedAmounts[Field.LIQUIDITY]?.toSignificant(6)}
            </Text>
          </RowFixed>
        </RowBetween>
        {pair && (
          <>
            <RowBetween>
              <Text color={theme.text2} fontWeight={500} fontSize={16}>
                Price
              </Text>
              <Text fontWeight={500} fontSize={16} color={theme.text1}>
                1 {currencyA?.symbol} = {tokenA ? pair.priceOf(tokenA).toSignificant(6) : '-'} {currencyB?.symbol}
              </Text>
            </RowBetween>
            <RowBetween>
              <div />
              <Text fontWeight={500} fontSize={16} color={theme.text1}>
                1 {currencyB?.symbol} = {tokenB ? pair.priceOf(tokenB).toSignificant(6) : '-'} {currencyA?.symbol}
              </Text>
            </RowBetween>
          </>
        )}
        <ButtonPrimary onClick={onDelete} disabled={isRemoved}>
          <Text fontWeight={500} fontSize={20}>
            {isRemoved ? <Dots>In Progress</Dots> : 'Confirm'}
          </Text>
        </ButtonPrimary>
      </>
    )
  }

  const pendingText = `Removing ${parsedAmounts[Field.CURRENCY_A]?.toSignificant(6)} ${
    currencyA?.symbol
  } and ${parsedAmounts[Field.CURRENCY_B]?.toSignificant(6)} ${currencyB?.symbol}`
  const liquidityPercentChangeCallback = useCallback(
    (value: number) => {
      onUserInput(Field.LIQUIDITY_PERCENT, value.toString())
    },
    [onUserInput]
  )

  const oneCurrencyIsWETH = Boolean(
    chainId &&
      ((currencyA && currencyEquals(WETH[chainId], currencyA)) ||
        (currencyB && currencyEquals(WETH[chainId], currencyB)))
  )

  const handleSelectCurrencyA = useCallback(
    (currency: Currency) => {
      if (currencyIdB && currencyId(currency) === currencyIdB) {
        history.push(`/remove/${currencyId(currency)}/${currencyIdA}`)
      } else {
        history.push(`/remove/${currencyId(currency)}/${currencyIdB}`)
      }
    },
    [currencyIdA, currencyIdB, history]
  )
  const handleSelectCurrencyB = useCallback(
    (currency: Currency) => {
      if (currencyIdA && currencyId(currency) === currencyIdA) {
        history.push(`/remove/${currencyIdB}/${currencyId(currency)}`)
      } else {
        history.push(`/remove/${currencyIdA}/${currencyId(currency)}`)
      }
    },
    [currencyIdA, currencyIdB, history]
  )

  const handleDismissConfirmation = useCallback(() => {
    setShowConfirm(false)
    setSignatureData(null) // important that we clear signature data to avoid bad sigs
    // if there was a tx hash, we want to clear the input
    if (txHash) {
      onUserInput(Field.LIQUIDITY_PERCENT, '0')
    }
    setTxHash('')
  }, [onUserInput, txHash])

  const [innerLiquidityPercentage, setInnerLiquidityPercentage] = useDebouncedChangeHandler(
    Number.parseInt(parsedAmounts[Field.LIQUIDITY_PERCENT].toFixed(0)),
    liquidityPercentChangeCallback
  )

  return (
    <>
      <AppBody>
        <AddRemoveTabs adding={false} />
        <Wrapper>
          <TransactionConfirmationModal
            isOpen={showConfirm}
            onDismiss={handleDismissConfirmation}
            attemptingTxn={attemptingTxn}
            hash={txHash ? txHash : ''}
            content={() => (
              <ConfirmationModalContent
                title={'You will receive'}
                onDismiss={handleDismissConfirmation}
                topContent={modalHeader}
                bottomContent={modalBottom}
              />
            )}
            pendingText={pendingText}
          />
          <AutoColumn gap="md">
            <LightCard>
              <AutoColumn gap="20px">
                <RowBetween>
                  <Text fontWeight={500}>Amount</Text>
                </RowBetween>
                <Row style={{ alignItems: 'flex-end' }}>
                  <Text fontSize={72} fontWeight={500}>
                    {formattedAmounts[Field.LIQUIDITY_PERCENT]}%
                  </Text>
                </Row>
                {!showDetailed && (
                  <>
                    <Slider value={innerLiquidityPercentage} onChange={setInnerLiquidityPercentage} />
                    <RowBetween>
                      <MaxButton onClick={() => onUserInput(Field.LIQUIDITY_PERCENT, '25')} width="20%">
                        25%
                      </MaxButton>
                      <MaxButton onClick={() => onUserInput(Field.LIQUIDITY_PERCENT, '50')} width="20%">
                        50%
                      </MaxButton>
                      <MaxButton onClick={() => onUserInput(Field.LIQUIDITY_PERCENT, '75')} width="20%">
                        75%
                      </MaxButton>
                      <MaxButton onClick={() => onUserInput(Field.LIQUIDITY_PERCENT, '100')} width="20%">
                        Max
                      </MaxButton>
                    </RowBetween>
                  </>
                )}
              </AutoColumn>
            </LightCard>
            {!showDetailed && (
              <>
                <ColumnCenter>
                  <ArrowDown size="16" color={theme.text2} />
                </ColumnCenter>
                <LightCard>
                  <AutoColumn gap="10px">
                    <RowBetween>
                      <Text fontSize={24} fontWeight={500}>
                        {balances.balanceABNFloat !== null ? getFirst10Characters(balances.balanceABNFloat) : '-'}{' '}
                      </Text>
                      <RowFixed>
                        <CurrencyLogo currency={currencyA} style={{ marginRight: '12px' }} />
                        <Text fontSize={24} fontWeight={500} id="remove-liquidity-tokena-symbol">
                          {currencyA?.symbol}
                        </Text>
                      </RowFixed>
                    </RowBetween>
                    <RowBetween>
                      <Text fontSize={24} fontWeight={500}>
                        {balances.balanceBBNFloat !== null ? getFirst10Characters(balances.balanceBBNFloat) : '-'}{' '}
                      </Text>
                      <RowFixed>
                        <CurrencyLogo currency={currencyB} style={{ marginRight: '12px' }} />
                        <Text fontSize={24} fontWeight={500} id="remove-liquidity-tokenb-symbol">
                          {currencyB?.symbol}
                        </Text>
                      </RowFixed>
                    </RowBetween>
                  </AutoColumn>
                </LightCard>
              </>
            )}

            {showDetailed && (
              <>
                <CurrencyInputPanel
                  value={formattedAmounts[Field.LIQUIDITY]}
                  onUserInput={onLiquidityInput}
                  onMax={() => {
                    onUserInput(Field.LIQUIDITY_PERCENT, '100')
                  }}
                  showMaxButton={!atMaxAmount}
                  disableCurrencySelect
                  currency={pair?.liquidityToken}
                  pair={pair}
                  id="liquidity-amount"
                />
                <ColumnCenter>
                  <ArrowDown size="16" color={theme.text2} />
                </ColumnCenter>
                <CurrencyInputPanel
                  hideBalance={true}
                  value={formattedAmounts[Field.CURRENCY_A]}
                  onUserInput={onCurrencyAInput}
                  onMax={() => onUserInput(Field.LIQUIDITY_PERCENT, '100')}
                  showMaxButton={!atMaxAmount}
                  currency={currencyA}
                  label={'Output'}
                  onCurrencySelect={handleSelectCurrencyA}
                  id="remove-liquidity-tokena"
                />
                <ColumnCenter>
                  <Plus size="16" color={theme.text2} />
                </ColumnCenter>
                <CurrencyInputPanel
                  hideBalance={true}
                  value={formattedAmounts[Field.CURRENCY_B]}
                  onUserInput={onCurrencyBInput}
                  onMax={() => onUserInput(Field.LIQUIDITY_PERCENT, '100')}
                  showMaxButton={!atMaxAmount}
                  currency={currencyB}
                  label={'Output'}
                  onCurrencySelect={handleSelectCurrencyB}
                  id="remove-liquidity-tokenb"
                />
              </>
            )}
            {pair && (
              <>
                <RowBetween>
                  <Text color={theme.text2} fontWeight={500} fontSize={16}>
                    Price
                  </Text>
                  <Text fontWeight={500} fontSize={16} color={theme.text1}>
                    1 {currencyA?.symbol} = {tokenA ? pair.priceOf(tokenA).toSignificant(6) : '-'} {currencyB?.symbol}
                  </Text>
                </RowBetween>
                <RowBetween>
                  <div />
                  <Text fontWeight={500} fontSize={16} color={theme.text1}>
                    1 {currencyB?.symbol} = {tokenB ? pair.priceOf(tokenB).toSignificant(6) : '-'} {currencyA?.symbol}
                  </Text>
                </RowBetween>
              </>
            )}
            <div style={{ position: 'relative' }}>
              {!account ? (
                <ButtonLight onClick={toggleWalletModal}>Connect Wallet</ButtonLight>
              ) : (
                <RowBetween>
                  {isApproved && (
                    <ButtonConfirmed
                      onClick={onAttemptToApprove}
                      confirmed={approval === ApprovalState.APPROVED || signatureData !== null}
                      disabled={typedValue === '0' ? true : false || isPending}
                      mr="0.5rem"
                      fontWeight={500}
                      fontSize={16}
                    >
                      {!isPending ? 'Approve' : <Dots>Approving</Dots>}
                    </ButtonConfirmed>
                  )}
                  <ButtonError
                    onClick={() => {
                      setShowConfirm(true)
                    }}
                    disabled={typedValue === '0' ? true : false || isApproved}
                    error={!isValid && !!parsedAmounts[Field.CURRENCY_A] && !!parsedAmounts[Field.CURRENCY_B]}
                  >
                    <Text fontSize={16} fontWeight={500}>
                      {'Remove'}
                    </Text>
                  </ButtonError>
                </RowBetween>
              )}
            </div>
          </AutoColumn>
        </Wrapper>
      </AppBody>

      {pair ? (
        <AutoColumn style={{ minWidth: '20rem', marginTop: '1rem' }}>
          <MinimalPositionCard
            showUnwrapped={oneCurrencyIsWETH}
            pair={pair}
            balanceA={balanceA}
            balanceB={balanceB}
            pairTotalSupply={pairTotalSupply}
            myPairBalance={myPairBalance}
          />
        </AutoColumn>
      ) : null}
    </>
  )
}
