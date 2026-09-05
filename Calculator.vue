<template>
  <div class="calculator">
    <div class="display">{{ displayValue }}</div>
    <div class="buttons">
      <button @click="handleNumber('7')">7</button>
      <button @click="handleNumber('8')">8</button>
      <button @click="handleNumber('9')">9</button>
      <button @click="handleOp('/')">/</button>
      
      <button @click="handleNumber('4')">4</button>
      <button @click="handleNumber('5')">5</button>
      <button @click="handleNumber('6')">6</button>
      <button @click="handleOp('*')">*</button>
      
      <button @click="handleNumber('1')">1</button>
      <button @click="handleNumber('2')">2</button>
      <button @click="handleNumber('3')">3</button>
      <button @click="handleOp('-')">-</button>
      
      <button @click="handleNumber('0')">0</button>
      <button @click="reset">C</button>
      <button @click="calculate">=</button>
      <button @click="handleOp('+')">+</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const displayValue = ref('0');
const firstOperand = ref(null);
const operator = ref(null);
const waitingForSecondOperand = ref(false);

const handleNumber = (num) => {
  if (displayValue.value === '0' || waitingForSecondOperand.value) {
    displayValue.value = num;
    waitingForSecondOperand.value = false;
  } else {
    displayValue.value += num;
  }
};

const handleOp = (op) => {
  firstOperand.value = parseFloat(displayValue.value);
  operator.value = op;
  waitingForSecondOperand.value = true;
};

const calculate = () => {
  const secondOperand = parseFloat(displayValue.value);
  let result = 0;

  switch (operator.value) {
    case '+': result = firstOperand.value + secondOperand; break;
    case '-': result = firstOperand.value - secondOperand; break;
    case '*': result = firstOperand.value * secondOperand; break;
    case '/': 
      if (secondOperand === 0) {
        displayValue.value = "Error";
        return;
      }
      result = firstOperand.value / secondOperand; 
      break;
  }
  
  displayValue.value = String(result);
  firstOperand.value = null;
  operator.value = null;
};

const reset = () => {
  displayValue.value = '0';
  firstOperand.value = null;
  operator.value = null;
};
</script>

<style scoped>
.calculator { border: 1px solid #ccc; padding: 10px; width: 200px; }
.display { background: #eee; padding: 10px; text-align: right; margin-bottom: 10px; }
.buttons { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; }
</style>
