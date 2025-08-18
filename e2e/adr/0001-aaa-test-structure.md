# Adopt Arrange–Act–Assert (AAA) Pattern for All Tests

## Status
Proposed

## Context

Our tests are currently written in different styles, which makes them harder to read, understand, and maintain.

To improve **readability** and make it easier to **debug failing tests**, we want to standardize the structure of tests by following the well-known **Arrange–Act–Assert (AAA)** pattern.

## Decision

We will adopt the AAA pattern for tests. Every test should follow this structure:

1. **Arrange**: Set up data, mocks, page state, or environment
2. **Act**: Perform the action being tested
3. **Assert**: Check the expected outcome

## Guidelines

- ✅ Multiple actions and assertions are **allowed** as long as they belong to a **single AAA flow**
- 🚫 **Repeating the full AAA structure in a single test is discouraged**, except for performance‑sensitive tests where setup cost is prohibitively high
- ✂️ If a test involves multiple unrelated behaviors, **split it into separate test cases**
- 🧼 Keep tests focused and predictable: one test = one scenario

## Example

```ts
test('user can view their post', async ({ page }) => {
  // Arrange
  const user = await userFactory.create();
  const post = await postFactory.create({ userId: user.id });

  // Act
  await page.goto(`/posts/${post.id}`);

  // Assert
  await expect(page.getByText(post.title)).toBeVisible();
});
