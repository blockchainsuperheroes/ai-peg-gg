export function getFirst10Characters(value: string | number): string {
  // Convert the value to a string
  const strValue = value.toString()

  // Return the first 19 characters
  return strValue.substring(0, 10)
}
export function getSymbolCharacter(value: string | undefined): string | undefined {
  // Convert the value to a string
  const strValue = value?.toString()

  // Return the first 19 characters
  return strValue?.substring(0, 3) ?? undefined
}
