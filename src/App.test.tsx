import { render, screen, fireEvent, waitFor } from "@solidjs/testing-library";
import { vi, describe, it, expect, beforeEach } from "vitest";
import App from "./App";

// Mock the browser storage to return initial collections data
const mockCollections = [
  {
    id: "1",
    name: "Work",
    items: [
      {
        id: "1",
        title: "Example Work Item",
        url: "https://work.example.com",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    subcollections: [],
  },
  {
    id: "2",
    name: "Personal",
    items: [
      {
        id: "2",
        title: "Example Personal Item",
        url: "https://personal.example.com",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    subcollections: [],
  },
];

describe("App Component", () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Mock browser.storage.local.get to return our test collections
    globalThis.browser.storage.local.get = vi.fn().mockResolvedValue({
      collections: mockCollections,
    });

    // Mock browser.storage.local.set
    globalThis.browser.storage.local.set = vi.fn().mockResolvedValue(undefined);

    // Mock browser.tabs.query for the import functionality
    globalThis.browser.tabs.query = vi.fn().mockResolvedValue([
      {
        id: 1,
        url: "https://example.com",
        title: "Test Page",
        active: true,
      },
    ]);
  });

  it("should display Import Tab button alongside Add Collection button", async () => {
    render(() => <App />);

    // Wait for data to load
    await waitFor(() => {
      expect(globalThis.browser.storage.local.get).toHaveBeenCalled();
    });

    // Find both buttons
    const addButton = await screen.findByRole("button", {
      name: /add collection/i,
    });
    const importButton = await screen.findByRole("button", {
      name: /import tab/i,
    });

    // Assert both buttons are displayed
    expect(addButton).toBeInTheDocument();
    expect(importButton).toBeInTheDocument();

    // Import button should be disabled initially (no collection selected)
    expect(importButton).toBeDisabled();
  });

  it("should show prompt when Add Collection button is clicked", async () => {
    // Mock window.prompt
    const mockPrompt = vi.fn().mockReturnValue("New Collection");
    globalThis.window.prompt = mockPrompt;

    render(() => <App />);

    // Find and click the Add Collection button
    const addButton = await screen.findByRole("button", {
      name: /add collection/i,
    });
    fireEvent.click(addButton);

    // Verify that prompt was called with correct message
    expect(mockPrompt).toHaveBeenCalledWith("Enter collection name:");
  });

  it("should display Collections sidebar with header", async () => {
    render(() => <App />);

    // Wait for data to load
    await waitFor(() => {
      expect(globalThis.browser.storage.local.get).toHaveBeenCalled();
    });

    // Wait for Collections header to appear
    const collectionsHeader = await screen.findByRole("heading", {
      name: /collections/i,
    });

    // Assert Collections sidebar is displayed
    expect(collectionsHeader).toBeInTheDocument();
    expect(collectionsHeader).toBeVisible();
  });

  it("should render collections from mocked storage data", async () => {
    render(() => <App />);

    // Wait for storage to be called and data to load
    await waitFor(() => {
      expect(globalThis.browser.storage.local.get).toHaveBeenCalledWith(
        "collections",
      );
    });

    // Wait for collections to load and check if mocked collection names appear
    const workCollection = await screen.findByText("Work");
    const personalCollection = await screen.findByText("Personal");

    expect(workCollection).toBeInTheDocument();
    expect(personalCollection).toBeInTheDocument();
  });

  it("should handle browser storage errors gracefully", async () => {
    // Mock storage to reject
    globalThis.browser.storage.local.get = vi
      .fn()
      .mockRejectedValue(new Error("Storage error"));

    // Should still render without crashing
    render(() => <App />);

    // Wait for the storage call to complete (and fail)
    await waitFor(() => {
      expect(globalThis.browser.storage.local.get).toHaveBeenCalled();
    });

    // Should show error message instead of buttons
    const errorMessage = await screen.findByText("Error fetching bookmarks");
    expect(errorMessage).toBeInTheDocument();
  });

  it("should keep import button disabled when no collection is selected", async () => {
    render(() => <App />);

    // Wait for data to load
    await waitFor(() => {
      expect(globalThis.browser.storage.local.get).toHaveBeenCalled();
    });

    const importButton = await screen.findByRole("button", {
      name: /import tab/i,
    });

    // Import button should be disabled initially (no collection selected)
    expect(importButton).toBeDisabled();
    expect(importButton).toHaveAttribute("disabled");

    // Clicking the disabled button should not trigger any action
    fireEvent.click(importButton);

    // Verify that browser.tabs.query was not called (no import attempted)
    expect(globalThis.browser.tabs.query).not.toHaveBeenCalled();
  });

  it("should enable import button when a collection is selected", async () => {
    render(() => <App />);

    // Wait for data to load
    await waitFor(() => {
      expect(globalThis.browser.storage.local.get).toHaveBeenCalled();
    });

    const importButton = await screen.findByRole("button", {
      name: /import tab/i,
    });

    // Initially disabled
    expect(importButton).toBeDisabled();

    // Click on a collection to select it
    const workCollection = await screen.findByText("Work");
    fireEvent.click(workCollection);

    // Wait for the selection to take effect
    await waitFor(() => {
      expect(importButton).not.toBeDisabled();
    });

    expect(importButton).not.toHaveAttribute("disabled");
  });

  it("should disable import button again when collection is deselected", async () => {
    render(() => <App />);

    // Wait for data to load
    await waitFor(() => {
      expect(globalThis.browser.storage.local.get).toHaveBeenCalled();
    });

    const importButton = await screen.findByRole("button", {
      name: /import tab/i,
    });
    const workCollection = await screen.findByText("Work");

    // Select a collection
    fireEvent.click(workCollection);
    await waitFor(() => {
      expect(importButton).not.toBeDisabled();
    });

    // Deselect the same collection by clicking it again
    fireEvent.click(workCollection);
    await waitFor(() => {
      expect(importButton).toBeDisabled();
    });

    expect(importButton).toHaveAttribute("disabled");
  });
});
