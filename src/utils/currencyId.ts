import { Currency, ETHER, Token } from '../dist'
Object.assign(ETHER, { address: '0xBF84c848159C262354922A1b1f460Ebe7f991073' })

export function currencyId(currency: Currency): string {
  if (currency === ETHER) return 'PEN'
  if (currency instanceof Token) return currency.address
  throw new Error('invalid currency')
}
