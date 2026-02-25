import React, { useEffect, useState } from 'react'
import Modal from '../Modal'
import styled from 'styled-components'
import BannerImage from '../../assets/images/Swapfive banner.png'
import { ReactComponent as Close } from '../../assets/images/x.svg'
import { ButtonPrimary } from '../Button'

const ModalContentWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem 0 1rem 0;
  background-color: ${({ theme }) => theme.bg2};
  border-radius: 8px;
`

const StyledBannerImage = styled.img`
  width: 96%;
  border-radius: 8px;
`

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

// Create a styled component for the button with responsiveness
const StyledPlayButton = styled(ButtonPrimary)`
  position: absolute;
  top: 79%;
  left: 37%;
  background: #a020f0 !important;
  max-width: 198px;
  max-height: 45px;
  border-radius: 100px;
  font-weight: 900;
  font-size: 24px;
  white-space: nowrap;

  /* Responsive behavior */
  @media (max-width: 1280px) {
    max-width: 160px;
    font-size: 20px;
    max-height: 40px;
  }
  @media (max-width: 768px) {
    max-width: 150px;
    font-size: 16px;
    max-height: 30px;
  }

  @media (max-width: 500px) {
    max-width: 130px;
    font-size: 14px;
    max-height: 20px;
    top: 78%;
    left: 36%;
  }
  @media (max-width: 400px) {
    max-width: 110px;
    font-size: 14px;
    max-height: 20px;
    top: 78%;
    left: 36%;
    padding: 12px;
  }
`
const BannerModal = () => {
  const [showConfirmation, setShowConfirmation] = useState(false)

  useEffect(() => {
    setShowConfirmation(true)
  }, [])

  return (
    <Modal
      isOpen={showConfirmation}
      onDismiss={() => setShowConfirmation(false)}
      maxHeight={100}
      maxWidth={900}
      mobileAlign
    >
      <ModalContentWrapper>
        <CloseIcon onClick={() => setShowConfirmation(false)}>
          <CloseColor />
        </CloseIcon>
        <StyledBannerImage src={BannerImage} alt="Banner image" />
        <StyledPlayButton
          onClick={() => window.open('https://x.com/PentagonGamesXP/status/1842158345131569557', '_blank')}
        >
          PLAY NOW!
        </StyledPlayButton>
      </ModalContentWrapper>
    </Modal>
  )
}

export default BannerModal
