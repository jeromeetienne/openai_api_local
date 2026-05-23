export class Index {
	static async main(): Promise<void> {
		console.log('openai_api_local: see ./examples for runnable scripts.');
		console.log('  npm run example:chat-openai');
		console.log('  npm run example:chat-lmstudio');
		console.log('  npm run example:agent-openai');
		console.log('  npm run example:agent-lmstudio');
		console.log('  npm run example:chat-openai-full');
	}
}

await Index.main();
