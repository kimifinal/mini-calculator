
import unittest

def calculate(first, second, op):
    try:
        if op == '+': return first + second
        if op == '-': return first - second
        if op == '*': return first * second
        if op == '/':
            if second == 0: return "Error"
            return first / second
        return None
    except Exception:
        return "Error"

class TestCalculator(unittest.TestCase):
    def test_addition(self):
        self.assertEqual(calculate(5, 3, '+'), 8)

    def test_subtraction(self):
        self.assertEqual(calculate(10, 4, '-'), 6)

    def test_multiplication(self):
        self.assertEqual(calculate(4, 3, '*'), 12)

    def test_division(self):
        self.assertEqual(calculate(10, 2, '/'), 5)

    def test_division_by_zero(self):
        self.assertEqual(calculate(10, 0, '/'), "Error")

if __name__ == '__main__':
    unittest.main()
