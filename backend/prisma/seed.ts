async function main() {
  console.info('Nenhum dado inicial definido para a Sprint 0.');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
