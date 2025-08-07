// 1. Create a ThemeToggle.js component
import { IconButton, useColorMode } from '@chakra-ui/react';
import { MoonIcon, SunIcon } from '@chakra-ui/icons';

function ThemeToggle() {
  const { colorMode, toggleColorMode } = useColorMode();

  return (
<IconButton
  aria-label="Toggle dark mode"
  icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
  onClick={toggleColorMode}
  variant="ghost"
  color="white"
  _hover={{ bg: 'blue.600' }}
  ml={2}
/>

  );
}

export default ThemeToggle;
