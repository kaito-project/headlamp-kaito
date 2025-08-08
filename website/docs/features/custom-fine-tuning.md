---
sidebar_position: 2
---

# Custom Fine Tuning

Headlamp-KAITO supports custom fine-tuning of AI models to adapt them to your specific use cases and requirements. This system manages parameters that affect AI model behavior during chat interactions, including response randomness and output length limits

## Default Configuration

The system provides default configuration values through the DEFAULT_OPENAI_CONFIG constant. These defaults are designed to provide balanced AI model behavior suitable for most use cases.

| Parameter   | Default Value | Description                                                                         |
| ----------- | ------------- | ----------------------------------------------------------------------------------- |
| temperature | 0.7           | Controls randomness in AI responses (0.0 = deterministic, 1.0 = maximum randomness) |
| maxTokens   | 1000          | Maximum number of tokens the AI model can generate in a single response             |
| top_p       | 1.0           | Controls nucleus sampling; limits responses to the most probable tokens (0.0–1.0)   |
| top_k       | 0             | Limits responses to the top k most likely tokens (0 = disabled, higher = more focused) |


## Model Setting Configuration

The ModelSettingsDialog component provides a user interface for customizing AI model parameters. This dialog presents the configuration options through interactive sliders that allow real-time adjustment of model behavior.

### Configuration Properties

#### Temperature

The temperature parameter controls the randomness of AI model responses. The ModelSettingsDialog implements temperature adjustment through a range slider with the following specifications:

- **Range**: 0.0 to 1.0
- **Step**: 0.01
- **Default**: 0.7

Lower temperature values produce more deterministic and focused responses, while higher values increase creativity and randomness.

#### Max Tokens

The max tokens parameter limits the length of AI model responses. The configuration system implements this through:

- **Range**: 100 to 4000 tokens
- **Step**: 50 tokens
- **Default**: 1000 tokens

This parameter directly affects response length and computational resource usage during AI interactions.

#### Top P

The top_p parameter controls nucleus sampling, which limits responses to the most probable tokens. In the ModelSettingsDialog, this is configured via a slider with:

- **Range**: 0.0 to 1.0
- **Step**: 0.01
- **Default**: 1.0

Lower values restrict the model to a smaller set of likely tokens, making responses more focused. Higher values allow for more diverse outputs.

#### Top K

The top_k parameter restricts responses to the top k most likely tokens. The ModelSettingsDialog provides a slider for this setting:

- **Range**: 0 to 100
- **Step**: 1
- **Default**: 0 (disabled)

Increasing top_k focuses the model’s output on the most probable tokens, while a value of 0 disables this restriction for broader responses.
## Integration with Chat

Once fine-tuning is complete, your custom model can be used in the chat interface:

1. **Deploy the fine-tuned model** using a new Workspace
2. **Select the model** in the chat interface
3. **Test the fine-tuned behavior** with domain-specific prompts

This seamless integration allows you to immediately benefit from your custom fine-tuning efforts within the familiar Headlamp-KAITO chat experience. The AI model configuration integrates with the chat system to provide users with control over AI model behavior during conversations. The configuration is applied when making requests to OpenAI-compatible endpoints, affecting both the quality and characteristics of AI responses
