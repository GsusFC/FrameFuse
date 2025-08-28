// 🔍 ARCHIVO DE PRUEBA PARA CODE QUALITY GATES
// Este archivo contiene errores intencionales para probar el sistema

// ❌ ERROR 1: Variable no utilizada
const unusedVariable = 'This should trigger ESLint';

// ❌ ERROR 2: Uso de var en lugar de let/const
var oldSchoolVar = 'This is bad practice';

// ❌ ERROR 3: Console.log en producción
console.log('This should not be in production code');

// ❌ ERROR 4: Uso de eval (vulnerabilidad de seguridad)
const userInput = 'console.log("test")';
eval(userInput); // Esto debería ser detectado como vulnerabilidad

// ❌ ERROR 5: Uso de '==' en lugar de '==='
const comparisonTest = (a: any, b: any) => a == b; // Debería ser ===

// ✅ Este comentario está bien - es solo para probar que el archivo existe
export { comparisonTest };
