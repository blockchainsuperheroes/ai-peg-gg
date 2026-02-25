/* eslint-disable react-hooks/exhaustive-deps */
import { ChainId, Currency, CurrencyAmount, JSBI, Token, Trade } from '../../../src/dist'
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { BigNumber, ethers } from 'ethers'
import { ArrowDown } from 'react-feather'
import ReactGA from 'react-ga'
import { Text } from 'rebass'
import { ThemeContext } from 'styled-components'
import AddressInputPanel from '../../components/AddressInputPanel'
import { ButtonError, ButtonPrimary } from '../../components/Button'

import { AutoColumn } from '../../components/Column'
import ConfirmSwapModal from '../../components/swap/ConfirmSwapModal'
import CurrencyInputPanel from '../../components/CurrencyInputPanel'
import { SwapPoolTabs } from '../../components/NavigationTabs'
import { AutoRow, RowBetween } from '../../components/Row'
import AdvancedSwapDetailsDropdown from '../../components/swap/AdvancedSwapDetailsDropdown'
import confirmPriceImpactWithoutFee from '../../components/swap/confirmPriceImpactWithoutFee'
import { ArrowWrapper, Wrapper } from '../../components/swap/styleds'

import TokenWarningModal from '../../components/TokenWarningModal'
import { useApproveCallback } from '../../hooks/useApproveCallback'
import { ROUTER_ADDRESS, WETH_ADDRESS } from '../../constants'
import { getTradeVersion } from '../../data/V1'
import { useActiveWeb3React } from '../../hooks'
import { useCurrency } from '../../hooks/Tokens'
import useENSAddress from '../../hooks/useENSAddress'
import { useSwapCallback } from '../../hooks/useSwapCallback'
import useToggledVersion, { Version } from '../../hooks/useToggledVersion'
import useWrapCallback, { WrapType } from '../../hooks/useWrapCallback'
import { Field, typeInput } from '../../state/swap/actions'
import {
  useDefaultsFromURLSearch,
  useDerivedSwapInfo,
  useSwapActionHandlers,
  useSwapState
} from '../../state/swap/hooks'
import { useExpertModeManager, useUserDeadline, useUserSlippageTolerance } from '../../state/user/hooks'
import { LinkStyledButton } from '../../theme'
import { maxAmountSpend } from '../../utils/maxAmountSpend'
import { computeTradePriceBreakdown } from '../../utils/prices'
import AppBody from '../AppBody'
import { Dots } from '../Pool/styleds'
import { getRouterContract } from '../../utils'
import { useDispatch } from 'react-redux'
import { useTransactionAdder } from '../../state/transactions/hooks'
import { useToasts } from 'react-toast-notifications'
import { useWalletModalToggle } from '../../state/application/hooks'
interface PropsCurrencyExtend extends Currency {
  readonly address: string
}

type Currencies = {
  [key in Field]: PropsCurrencyExtend // Ensure that each value is of type PropsCurrencyExtend
}
export enum ApprovalState {
  UNKNOWN,
  NOT_APPROVED,
  PENDING,
  APPROVED
}
export default function Swap() {
  const [estAmount, setEstAmount] = useState<string>()
  const loadedUrlParams = useDefaultsFromURLSearch()
  const { chainId, library } = useActiveWeb3React()
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const dispatch = useDispatch()
  const { addToast } = useToasts()

  // token warning stuff
  const [loadedInputCurrency, loadedOutputCurrency] = [
    useCurrency(loadedUrlParams?.inputCurrencyId),
    useCurrency(loadedUrlParams?.outputCurrencyId)
  ]
  const [dismissTokenWarning, setDismissTokenWarning] = useState<boolean>(false)
  const urlLoadedTokens: Token[] = useMemo(
    () => [loadedInputCurrency, loadedOutputCurrency]?.filter((c): c is Token => c instanceof Token) ?? [],
    [loadedInputCurrency, loadedOutputCurrency]
  )
  const handleConfirmTokenWarning = useCallback(() => {
    setDismissTokenWarning(true)
  }, [])

  const { account } = useActiveWeb3React()
  const theme = useContext(ThemeContext)

  const [isExpertMode] = useExpertModeManager()

  // get custom setting values for user
  const [deadline] = useUserDeadline()
  const [allowedSlippage] = useUserSlippageTolerance()
  const addTransaction = useTransactionAdder()
  const [isBalance, setIsBalance] = useState(false)
  // swap state
  const { independentField, typedValue, recipient } = useSwapState()
  const { v1Trade, v2Trade, currencyBalances, parsedAmount, currencies } = useDerivedSwapInfo()
  const { wrapType } = useWrapCallback(currencies[Field.INPUT], currencies[Field.OUTPUT], typedValue)
  const showWrap: boolean = wrapType !== WrapType.NOT_APPLICABLE
  const { address: recipientAddress } = useENSAddress(recipient)
  const toggledVersion = useToggledVersion()
  const toggleWalletModal = useWalletModalToggle()

  const trade = showWrap
    ? undefined
    : {
        [Version.v1]: v1Trade,
        [Version.v2]: v2Trade
      }[toggledVersion]

  const parsedAmounts = showWrap
    ? {
        [Field.INPUT]: parsedAmount,
        [Field.OUTPUT]: parsedAmount
      }
    : {
        [Field.INPUT]: independentField === Field.INPUT ? parsedAmount : trade?.inputAmount,
        [Field.OUTPUT]: independentField === Field.OUTPUT ? parsedAmount : trade?.outputAmount
      }
  const [approvalA, approveACallback] = useApproveCallback(parsedAmounts[Field.INPUT], ROUTER_ADDRESS)
  const [approvalB, approveBCallback] = useApproveCallback(parsedAmounts[Field.OUTPUT], ROUTER_ADDRESS)

  const { onSwitchTokens, onCurrencySelection, onUserInput, onChangeRecipient } = useSwapActionHandlers()
  const dependentField: Field = independentField === Field.INPUT ? Field.OUTPUT : Field.INPUT

  const handleTypeInput = useCallback(
    (value: string) => {
      onUserInput(Field.INPUT, value)
    },
    [onUserInput]
  )
  const handleTypeOutput = useCallback(
    (value: string) => {
      onUserInput(Field.OUTPUT, value)
    },
    [onUserInput]
  )

  // modal and loading
  const [{ showConfirm, tradeToConfirm, swapErrorMessage, attemptingTxn, txHash }, setSwapState] = useState<{
    showConfirm: boolean
    tradeToConfirm: Trade | undefined
    attemptingTxn: boolean
    swapErrorMessage: string | undefined
    txHash: string | undefined
  }>({
    showConfirm: false,
    tradeToConfirm: undefined,
    attemptingTxn: false,
    swapErrorMessage: undefined,
    txHash: undefined
  })

  const formattedAmounts = {
    [independentField]: typedValue,
    [dependentField]: showWrap
      ? parsedAmounts[independentField]?.toExact() ?? ''
      : parsedAmounts[dependentField]?.toSignificant(6) ?? ''
  }
  const maxAmountInput: CurrencyAmount | undefined = maxAmountSpend(currencyBalances[Field.INPUT])
  const atMaxAmountInput = Boolean(maxAmountInput && parsedAmounts[Field.INPUT]?.equalTo(maxAmountInput))

  // the callback to execute the swap
  const { callback: swapCallback } = useSwapCallback(trade, allowedSlippage, deadline, recipient)

  const { priceImpactWithoutFee } = computeTradePriceBreakdown(trade)

  const handleSwap = useCallback(() => {
    if (priceImpactWithoutFee && !confirmPriceImpactWithoutFee(priceImpactWithoutFee)) {
      return
    }
    if (!swapCallback) {
      return
    }
    setSwapState({ attemptingTxn: true, tradeToConfirm, showConfirm, swapErrorMessage: undefined, txHash: undefined })
    swapCallback()
      .then(hash => {
        setSwapState({ attemptingTxn: false, tradeToConfirm, showConfirm, swapErrorMessage: undefined, txHash: hash })

        ReactGA.event({
          category: 'Swap',
          action:
            recipient === null
              ? 'Swap w/o Send'
              : (recipientAddress ?? recipient) === account
              ? 'Swap w/o Send + recipient'
              : 'Swap w/ Send',
          label: [
            trade?.inputAmount?.currency?.symbol,
            trade?.outputAmount?.currency?.symbol,
            getTradeVersion(trade)
          ].join('/')
        })
      })
      .catch(error => {
        setSwapState({
          attemptingTxn: false,
          tradeToConfirm,
          showConfirm,
          swapErrorMessage: error.message,
          txHash: undefined
        })
      })
  }, [tradeToConfirm, account, priceImpactWithoutFee, recipient, recipientAddress, showConfirm, swapCallback, trade])

  // errors
  const handleConfirmDismiss = useCallback(() => {
    setSwapState({ showConfirm: false, tradeToConfirm, attemptingTxn, swapErrorMessage, txHash })
    // if there was a tx hash, we want to clear the input
    if (txHash) {
      onUserInput(Field.INPUT, '')
    }
  }, [attemptingTxn, onUserInput, swapErrorMessage, tradeToConfirm, txHash])

  const handleAcceptChanges = useCallback(() => {
    setSwapState({ tradeToConfirm: trade, swapErrorMessage, txHash, attemptingTxn, showConfirm })
  }, [attemptingTxn, showConfirm, swapErrorMessage, trade, txHash])

  const handleInputSelect = useCallback(
    inputCurrency => {
      onCurrencySelection(Field.INPUT, inputCurrency)
    },
    [onCurrencySelection]
  )

  const handleMaxInput = useCallback(() => {
    maxAmountInput && onUserInput(Field.INPUT, maxAmountInput.toExact())
  }, [maxAmountInput, onUserInput])

  const handlePercentInput = useCallback((percent: number) => {
    if (maxAmountInput) {
      const amount = parseFloat(maxAmountInput.toExact()) * (percent / 100)
      onUserInput(Field.INPUT, amount.toString())
    }
  }, [maxAmountInput, onUserInput])

  const handleOutputSelect = useCallback(
    outputCurrency => {
      onCurrencySelection(Field.OUTPUT, outputCurrency)
    },
    [onCurrencySelection]
  )

  useEffect(() => {
    handleInputSelect(Currency.ETHER)
    handleOutputSelect(
      new Token(ChainId.PEN, '0xd6717BC966f44a529C06f8316116c0EfA29E4480', 18, 'cPENTESTER', 'cPENTESTER')
    )
  }, [])

  const currenciesList: Currencies = {
    [Field.INPUT]: currencies[Field.INPUT] as PropsCurrencyExtend,
    [Field.OUTPUT]: currencies[Field.OUTPUT] as PropsCurrencyExtend
  }
  const inputAddress = currenciesList[Field.INPUT]?.address
  const outputAddress = currenciesList[Field.OUTPUT]?.address

  const getValue = async () => {
    setEstAmount(undefined)
    try {
      if (parseFloat(typedValue) <= 0 || !inputAddress || !outputAddress || !chainId || !library || !account) {
        console.error('Missing required parameters')
        return
      }
      setIsBalance(false)
      const scaledValue = await ethers.utils.parseUnits(typedValue.toString(), currencies[Field.INPUT]?.decimals)
      const userBalance: BigNumber | JSBI = currencyBalances[Field.INPUT]?.raw ?? BigNumber.from(0)
      let hasSufficientBalance
      if (userBalance instanceof JSBI) {
        hasSufficientBalance = JSBI.greaterThan(userBalance, JSBI.BigInt(scaledValue.toString()))
      }

      const router = await getRouterContract(chainId, library, account)
      const outAmount = await router.getAmountsOut(scaledValue.toString(), [inputAddress, outputAddress])
      const bigNumber = ethers.BigNumber.from(outAmount[1])
      const decimalString = ethers.utils.formatUnits(bigNumber, currencies[Field.OUTPUT]?.decimals)
      await setEstAmount(decimalString)
      if (!hasSufficientBalance) {
        console.error('Insufficient balance')
        setIsBalance(true)
        return
      }
    } catch (error) {
      console.error('Execution reverted!', error)
    }
  }
  useEffect(() => {
    getValue()
  }, [inputAddress, outputAddress, chainId, library, account, typedValue])

  const handleSwapRoute = useCallback(async () => {
    if (!typedValue || !inputAddress || !outputAddress || !chainId || !library || !account) {
      console.error('Missing required parameters')
      return
    }

    const router = getRouterContract(chainId, library, account)
    const scaledValue = ethers.utils.parseUnits(typedValue.toString(), currencies[Field.INPUT]?.decimals)
    setIsLoading(true)

    try {
      let transactionResponse

      if (inputAddress === WETH_ADDRESS) {
        transactionResponse = await router.swapExactPENForTokens(
          allowedSlippage,
          [inputAddress, outputAddress],
          account,
          Math.floor(Date.now() / 1000) + 60 * 20,
          { value: scaledValue.toString() }
        )
      } else if (outputAddress === WETH_ADDRESS) {
        transactionResponse = await router.swapExactTokensForPEN(
          scaledValue.toString(),
          allowedSlippage,
          [inputAddress, outputAddress],
          account,
          Math.floor(Date.now() / 1000) + 60 * 20
        )
      } else {
        transactionResponse = await router.swapExactTokensForTokens(
          scaledValue.toString(),
          allowedSlippage,
          [inputAddress, outputAddress],
          account,
          Math.floor(Date.now() / 1000) + 60 * 20
        )
      }

      console.log('Waiting for confirmation...', transactionResponse)

      const receipt = await transactionResponse.wait()

      if (receipt.status === 1) {
        console.log('Transaction confirmed', receipt)
        addTransaction(transactionResponse, {
          summary: 'Swap transaction confirmed'
        })
        dispatch(
          typeInput({
            field: Field.INPUT,
            typedValue: ''
          })
        )

        // Reset other state variables
        setEstAmount(undefined)
      } else {
        console.error('Transaction failed', receipt)
      }
    } catch (error) {
      addToast('Execution reverted!', {
        appearance: 'error',
        autoDismissTimeout: 2000,
        autoDismiss: true
      })
      console.error('Swap failed', error)
    } finally {
      setIsLoading(false)
    }
  }, [inputAddress, outputAddress, chainId, library, account, typedValue])
  const handleSwitchToken = () => {
    onUserInput(Field.INPUT, '')
    onUserInput(Field.OUTPUT, '')
    onSwitchTokens()
  }
  return (
    <>
      <TokenWarningModal
        isOpen={urlLoadedTokens.length > 0 && !dismissTokenWarning}
        tokens={urlLoadedTokens}
        onConfirm={handleConfirmTokenWarning}
      />
      <AppBody>
        <SwapPoolTabs active={'swap'} />
        <Wrapper id="swap-page">
          <ConfirmSwapModal
            isOpen={showConfirm}
            trade={trade}
            originalTrade={tradeToConfirm}
            onAcceptChanges={handleAcceptChanges}
            attemptingTxn={attemptingTxn}
            txHash={txHash}
            recipient={recipient}
            allowedSlippage={allowedSlippage}
            onConfirm={handleSwap}
            swapErrorMessage={swapErrorMessage}
            onDismiss={handleConfirmDismiss}
          />

          <AutoColumn gap={'md'}>
            <CurrencyInputPanel
              label={independentField === Field.OUTPUT && !showWrap ? 'From (estimated)' : 'From'}
              value={formattedAmounts[Field.INPUT]}
              showMaxButton={!atMaxAmountInput}
              currency={currencies[Field.INPUT]}
              onUserInput={handleTypeInput}
              onMax={handleMaxInput}
              onPercent={handlePercentInput}
              onCurrencySelect={handleInputSelect}
              otherCurrency={currencies[Field.OUTPUT]}
              id="swap-currency-input"
              estimatedAmount={independentField === Field.OUTPUT && !showWrap ? estAmount : '0.0'}
            />

            <AutoColumn justify="space-between">
              <AutoRow justify="space-between" style={{ padding: '0 1rem' }}>
                <ArrowWrapper clickable>
                  <ArrowDown
                    size="16"
                    onClick={() => handleSwitchToken()}
                    color={currencies[Field.INPUT] && currencies[Field.OUTPUT] ? theme.primary1 : theme.text2}
                  />
                </ArrowWrapper>
                {recipient === null && !showWrap && isExpertMode ? (
                  <LinkStyledButton id="add-recipient-button" onClick={() => onChangeRecipient('')}>
                    + Add a send (optional)
                  </LinkStyledButton>
                ) : null}
              </AutoRow>
            </AutoColumn>
            <CurrencyInputPanel
              value={formattedAmounts[Field.OUTPUT]}
              onUserInput={handleTypeOutput}
              label={independentField === Field.INPUT && !showWrap ? 'To (estimated)' : 'To'}
              showMaxButton={false}
              currency={currencies[Field.OUTPUT]}
              onCurrencySelect={handleOutputSelect}
              otherCurrency={currencies[Field.INPUT]}
              estimatedAmount={independentField === Field.INPUT && !showWrap ? estAmount : '0.0'}
              id="swap-currency-output"
            />

            {recipient !== null && !showWrap ? (
              <>
                <AutoRow justify="space-between" style={{ padding: '0 1rem' }}>
                  <ArrowWrapper clickable={false}>
                    <ArrowDown size="16" color={theme.text2} />
                  </ArrowWrapper>
                  <LinkStyledButton id="remove-recipient-button" onClick={() => onChangeRecipient(null)}>
                    - Remove send
                  </LinkStyledButton>
                </AutoRow>
                <AddressInputPanel id="recipient" value={recipient} onChange={onChangeRecipient} />
              </>
            ) : null}
          </AutoColumn>
          {account ? (
            <ButtonError
              type="submit"
              onClick={handleSwapRoute}
              style={{ marginTop: '24px' }}
              disabled={
                isLoading ||
                !typedValue ||
                !inputAddress ||
                !outputAddress ||
                !chainId ||
                !library ||
                !account ||
                !estAmount ||
                isBalance
              }
              error={isBalance || (estAmount === undefined && parseFloat(typedValue) > 0)}
            >
              <Text fontSize={20} fontWeight={500}>
                {isLoading ? (
                  <Dots> Swapping </Dots>
                ) : !typedValue ? (
                  'Enter Amount'
                ) : isBalance ? (
                  'Insufficient balance'
                ) : estAmount === undefined && parseFloat(typedValue) > 0 ? (
                  'No Liquidity Found'
                ) : (
                  'Swap'
                )}
              </Text>
            </ButtonError>
          ) : (
            <ButtonPrimary id="connect-wallet" onClick={toggleWalletModal}>
              <Text>{'Connect to a wallet'}</Text>
            </ButtonPrimary>
          )}
          <AutoColumn gap={'md'}>
            {(approvalA === ApprovalState.NOT_APPROVED ||
              approvalA === ApprovalState.PENDING ||
              approvalB === ApprovalState.NOT_APPROVED ||
              approvalB === ApprovalState.PENDING) && (
              <RowBetween style={{ marginTop: '40px' }}>
                {independentField === Field.INPUT && !showWrap
                  ? approvalA !== ApprovalState.APPROVED && (
                      <ButtonPrimary
                        onClick={approveACallback}
                        disabled={approvalA === ApprovalState.PENDING}
                        width={'100%'}
                      >
                        {approvalA === ApprovalState.PENDING ? (
                          <Dots>Approving {currencies[Field.INPUT]?.symbol}</Dots>
                        ) : (
                          'Approve ' + currencies[Field.INPUT]?.symbol
                        )}
                      </ButtonPrimary>
                    )
                  : approvalB !== ApprovalState.APPROVED && (
                      <ButtonPrimary
                        onClick={approveBCallback}
                        disabled={approvalB === ApprovalState.PENDING}
                        width={'100%'}
                      >
                        {approvalB === ApprovalState.PENDING ? (
                          <Dots>Approving {currencies[Field.OUTPUT]?.symbol}</Dots>
                        ) : (
                          'Approve ' + currencies[Field.OUTPUT]?.symbol
                        )}
                      </ButtonPrimary>
                    )}
              </RowBetween>
            )}
          </AutoColumn>
        </Wrapper>
      </AppBody>
      <AdvancedSwapDetailsDropdown trade={trade} />
    </>
  )
}
