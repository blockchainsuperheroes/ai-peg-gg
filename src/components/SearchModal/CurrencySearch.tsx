/* eslint-disable @typescript-eslint/no-unused-vars */
import { ChainId, Currency, ETHER, Token } from '../../../src/dist'
import React, { KeyboardEvent, RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactGA from 'react-ga'
import { useTranslation } from 'react-i18next'
import { FixedSizeList } from 'react-window'
import { Text } from 'rebass'
import { useActiveWeb3React } from '../../hooks'
import { useAllTokens, useToken } from '../../hooks/Tokens'
import { useSelectedListInfo } from '../../state/lists/hooks'
import { CloseIcon, TYPE } from '../../theme'
import { isAddress } from '../../utils'
import Card from '../Card'
import Column from '../Column'
import ListLogo from '../ListLogo'
import QuestionHelper from '../QuestionHelper'
import Row, { RowBetween } from '../Row'
import CommonBases from './CommonBases'
import CurrencyList from './CurrencyList'
import { filterTokens } from './filtering'
import SortButton from './SortButton'
import { useTokenComparator } from './sorting'
import { PaddedColumn, SearchInput, Separator } from './styleds'
import { useAddUserToken } from '../../state/user/hooks'

interface CurrencySearchProps {
  isOpen: boolean
  onDismiss: () => void
  selectedCurrency?: Currency
  onCurrencySelect: (currency: Currency) => void
  otherSelectedCurrency?: Currency
  showCommonBases?: boolean
  onChangeList: () => void
}

export function CurrencySearch({
  selectedCurrency,
  onCurrencySelect,
  otherSelectedCurrency,
  showCommonBases,
  onDismiss,
  isOpen,
  onChangeList
}: CurrencySearchProps) {
  const { t } = useTranslation()
  const { chainId } = useActiveWeb3React()
  const addToken = useAddUserToken()
  const fixedList = useRef<FixedSizeList>()
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [invertSearchOrder, setInvertSearchOrder] = useState<boolean>(false)
  const allTokens = useAllTokens()
  // if they input an address, use it
  const isAddressSearch = isAddress(searchQuery)
  const searchToken = useToken(searchQuery)

  useEffect(() => {
    if (isAddressSearch) {
      ReactGA.event({
        category: 'Currency Select',
        action: 'Search by address',
        label: isAddressSearch
      })
    }
  }, [isAddressSearch])

  const showETH: boolean = useMemo(() => {
    const s = searchQuery.toLowerCase().trim()
    return s === '' || s === 'e' || s === 'et' || s === 'eth'
  }, [searchQuery])

  const tokenComparator = useTokenComparator(invertSearchOrder)

  const filteredTokens: Token[] = useMemo(() => {
    if (isAddressSearch) return searchToken ? [searchToken] : []
    return filterTokens(Object.values(allTokens), searchQuery)
  }, [isAddressSearch, searchToken, allTokens, searchQuery])

  const filteredSortedTokens: Token[] = useMemo(() => {
    const staticTokens = [
      new Token(ChainId.PEN, '0x41eeaEe528350De0AeC628881123a387b8F2D6e9', 18, 'BARK', 'Bark'),
      new Token(ChainId.PEN, '0x8CA8D12eE524c6A2b55eB3208E97cD04dA23B32A', 18, 'FIVE', 'Five'),
      new Token(ChainId.PEN, '0xd6717BC966f44a529C06f8316116c0EfA29E4480', 18, 'cPENTESTER', 'cPENTESTER'),
      new Token(ChainId.PEN, '0x4356592b6CB360c25EfC2f6AFC2bB55266A1ab7E', 6, 'USDT', 'USDT')
    ]

    const uniqueTokens = (tokens: Token[]) => {
      const seen = new Set<string>()
      return tokens.filter(token => {
        const tokenId = `${token.chainId}-${token.address}`
        if (seen.has(tokenId)) {
          return false
        } else {
          seen.add(tokenId)
          return true
        }
      })
    }

    let combinedTokens = [...staticTokens]

    if (searchToken) {
      combinedTokens = uniqueTokens([searchToken])
    } else {
      const sorted = filteredTokens.sort(tokenComparator)
      combinedTokens = uniqueTokens([
        ...combinedTokens,
        ...sorted.filter(token => token.symbol?.toLowerCase() === searchQuery.toLowerCase()),
        ...sorted.filter(token => token.symbol?.toLowerCase() !== searchQuery.toLowerCase())
      ])
    }

    return combinedTokens
  }, [filteredTokens, searchQuery, searchToken, tokenComparator])

  const handleCurrencySelect = useCallback(
    (currency: Currency) => {
      onCurrencySelect(currency)
      onDismiss()
    },
    [onDismiss, onCurrencySelect]
  )

  // clear the input on open
  useEffect(() => {
    if (isOpen) setSearchQuery('')
  }, [isOpen])

  // manage focus on modal show
  const inputRef = useRef<HTMLInputElement>()
  const handleInput = useCallback(
    event => {
      const input = event.target.value
      const checksummedInput = isAddress(input)
      setSearchQuery(checksummedInput || input)
      fixedList.current?.scrollTo(0)
      // Add each token individually if it's a valid Token instance
      if (Array.isArray(filteredSortedTokens)) {
        filteredSortedTokens.forEach(token => {
          if (token instanceof Token) {
            addToken(token) // Assuming addToken is a function that dispatches an action or adds the token to some state
          }
        })
      }
    },
    [filteredSortedTokens, addToken]
  )

  const handleEnter = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        const s = searchQuery.toLowerCase().trim()
        if (s === 'eth') {
          handleCurrencySelect(ETHER)
        } else if (filteredSortedTokens.length > 0) {
          if (
            filteredSortedTokens[0].symbol?.toLowerCase() === searchQuery.trim().toLowerCase() ||
            filteredSortedTokens.length === 1
          ) {
            handleCurrencySelect(filteredSortedTokens[0])
          }
        }
      }
      if (Array.isArray(filteredSortedTokens)) {
        filteredSortedTokens.forEach(token => {
          if (token instanceof Token) {
            addToken(token) // Assuming addToken is a function that dispatches an action or adds the token to some state
          }
        })
      }
    },
    [filteredSortedTokens, handleCurrencySelect, searchQuery, addToken]
  )

  const selectedListInfo = useSelectedListInfo()

  return (
    <Column style={{ width: '100%', flex: '1 1' }}>
      <PaddedColumn gap="14px">
        <RowBetween>
          <Text fontWeight={500} fontSize={16}>
            Select a token
            <QuestionHelper text="Find a token by searching for its name or symbol or by pasting its address below." />
          </Text>
          <CloseIcon onClick={onDismiss} />
        </RowBetween>
        <SearchInput
          type="text"
          id="token-search-input"
          placeholder={t('tokenSearchPlaceholder')}
          value={searchQuery}
          ref={inputRef as RefObject<HTMLInputElement>}
          onChange={handleInput}
          onKeyDown={handleEnter}
        />
        {showCommonBases && (
          <CommonBases chainId={chainId} onSelect={handleCurrencySelect} selectedCurrency={selectedCurrency} />
        )}
        <RowBetween>
          <Text fontSize={14} fontWeight={500}>
            Token Name
          </Text>
          <SortButton ascending={invertSearchOrder} toggleSortOrder={() => setInvertSearchOrder(iso => !iso)} />
        </RowBetween>
      </PaddedColumn>

      <Separator />

      <div style={{ flex: '1' }}>
        <CurrencyList
          height={500}
          showETH={showETH}
          currencies={filteredSortedTokens}
          onCurrencySelect={handleCurrencySelect}
          otherCurrency={otherSelectedCurrency}
          selectedCurrency={selectedCurrency}
          fixedListRef={fixedList}
        />
      </div>

      <Separator />
      <Card>
        <RowBetween>
          {selectedListInfo.current ? (
            <Row>
              {selectedListInfo.current.logoURI ? (
                <ListLogo
                  style={{ marginRight: 12 }}
                  logoURI={selectedListInfo.current.logoURI}
                  alt={`${selectedListInfo.current.name} list logo`}
                />
              ) : null}
              <TYPE.main id="currency-search-selected-list-name">{selectedListInfo.current.name}</TYPE.main>
            </Row>
          ) : null}
        </RowBetween>
      </Card>
    </Column>
  )
}
