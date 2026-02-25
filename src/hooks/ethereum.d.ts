interface Window {
  ethereum?: {
    isMetaMask?: true
    on?: (...args: any[]) => void
    removeListener?: (...args: any[]) => void
    request: (args: { method: string; params?: any[] }) => Promise<any>;
  }
  web3?: {}
}