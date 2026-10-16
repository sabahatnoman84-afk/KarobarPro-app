<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 18 18"
    width="18"
    height="18"
    fill="none"
  >
    <rect
      x="0"
      y="0"
      width="18"
      height="18"
      rx="3"
      :fill="darkMode ? '#16a34a' : '#15803d'"
    />
    <text
      x="9"
      y="12.5"
      font-family="Inter, Arial, sans-serif"
      font-size="9"
      font-weight="700"
      text-anchor="middle"
      fill="#ffffff"
      letter-spacing="-0.5"
    >
      KP
    </text>
  </svg>
</template>
<script>
import Base from '../base.vue';
export default {
  name: 'KarobarProLogo',
  extends: Base,
};
</script>