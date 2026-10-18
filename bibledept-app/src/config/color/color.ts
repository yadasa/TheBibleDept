import Color from '../../dts/color'
import Typography from '../../dts/typography'
import { DeepPartial, Theme } from 'stream-chat-react-native'
import { StyleSheet } from 'react-native'
import colors from './palette'

export const generateStreamIOTheme = (color: Color, typography: Typography) => {
  const colors =
    color.id === 'dark'
      ? {
          accent_blue: color.blue,
          accent_green: '#20E070',
          accent_red: '#FF3742',
          bg_gradient_end: color.middle,
          bg_gradient_start: color.background,
          black: color.text,
          blue_alice: color.blue0,
          border: color.gray5,
          button_background: color.primary,
          button_text: color.white,
          grey: color.gray2, //'#7A7A7A',
          grey_gainsboro: color.gray6,
          grey_whisper: color.gray5,
          icon_background: '#FFFFFF',
          modal_shadow: '#000000',
          overlay: '#C5C5C556',
          overlay_dark: '#FFFFFFCC', // CC = 80% opacity
          shadow_icon: '#00000080', // 80 = 50% opacity
          targetedMessageBackground: '#302D22',
          transparent: 'transparent',
          white: color.background,
          white_smoke: color.gray5,
          white_snow: color.background,
        }
      : {
          accent_blue: color.blue,
          accent_green: '#20E070',
          accent_red: color.red, //'#FF3742',
          bg_gradient_end: color.middle,
          bg_gradient_start: color.background,
          black: '#000000',
          blue_alice: color.blue0,
          border: '#00000014', // 14 = 8% opacity; top: x=0, y=-1; bottom: x=0, y=1
          button_background: color.primary,
          button_text: '#FFFFFF',
          grey: color.gray, //'#7A7A7A',
          grey_gainsboro: color.gray6, //'#DBDBDB',
          grey_whisper: color.gray5,
          icon_background: '#FFFFFF',
          modal_shadow: '#00000099', // 99 = 60% opacity; x=0, y= 1, radius=4
          overlay: '#00000033', // 33 = 20% opacity
          overlay_dark: '#00000099', // 99 = 60% opacity
          shadow_icon: '#00000040', // 40 = 25% opacity; x=0, y=0, radius=4
          targetedMessageBackground: '#FBF4DD', // dark mode = #302D22
          transparent: 'transparent',
          white: '#FFFFFF',
          white_smoke: '#F2F2F2',
          white_snow: color.background,
        }

  const StreamTheme: DeepPartial<Theme> = {
    colors,
    attachmentPicker: {
      imageOverlaySelectedComponent: { check: { backgroundColor: 'red' } },
      bottomSheetContentContainer: { backgroundColor: color.background },
    },
    attachmentSelectionBar: {
      container: { backgroundColor: color.background, borderTopColor: `${color.gray5}99`, borderTopWidth: StyleSheet.hairlineWidth },
    },
    messageInput: {
      attachmentSelectionBar: { backgroundColor: color.background },
      container: { backgroundColor: color.background, borderTopWidth: 0, padding: 0, paddingHorizontal: 15, paddingVertical: 3 },
      inputBoxContainer: {
        borderRadius: 23,
        borderColor: `${color.gray5}99`,
        borderWidth: StyleSheet.hairlineWidth,
        backgroundColor: color.id === 'dark' ? color.middle : `${color.gray7}`,
      },
      giphyContainer: {
        marginVertical: 2,
      },
      sendButtonContainer: { padding: 0, paddingLeft: 0 },
      inputBox: { color: color.text, fontSize: typography.body },
      suggestions: {
        command: {
          title: { fontSize: typography.subhead },
          args: { fontSize: typography.subhead },
        },
        commandsHeader: { title: { fontSize: typography.subhead } },
      },
    },
    messageList: {},
    reply: {
      messageContainer: { backgroundColor: `${color.blue}30`, borderWidth: 0 },
      markdownStyles: { text: { color: color.text } },
    },
    thread: {
      newThread: {
        backgroundGradientStart: color.background,
        backgroundGradientStop: color.background,
        text: { fontWeight: 'bold' },
      },
    },
    messageSimple: {
      card: {
        container: { paddingHorizontal: 6, paddingBottom: 2 },
        authorName: { color: color.blue, marginRight: 5, textAlign: 'left' },
        authorNameContainer: { paddingHorizontal: 0, paddingRight: 5, backgroundColor: color.gray7 },
        authorNameFooterContainer: { backgroundColor: 'red' },
        footer: {
          flex: 1,
          title: { marginHorizontal: 0, color: color.text, fontSize: typography.subhead },
          description: { marginHorizontal: 0, color: color.gray2, fontSize: typography.footnote, lineHeight: 18 },
        },
      },
      content: {
        containerInner: { backgroundColor: color.gray7, borderWidth: 0 },
        messageUser: { color: color.text },
        replyContainer: { backgroundColor: color.background, paddingBottom: 5 },
        errorContainer: {
          paddingRight: 0,
          paddingTop: 10,
        },
        markdown: {
          text: { color: color.text, fontSize: typography.body },
        },
      },
    },
    imageGallery: {
      blurType: color.id === 'dark' ? 'dark' : 'light',
    },
    channel: {
      selectChannel: { fontWeight: 'bold', padding: 16 },
    },
  }

  return StreamTheme
}

export default colors
