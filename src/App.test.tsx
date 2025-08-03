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
    subcollections: [
      {
        id: "1-1",
        name: "Projects",
        items: [],
        subcollections: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "1-2",
        name: "Documentation",
        items: [],
        subcollections: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
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
    createdAt: new Date(),
    updatedAt: new Date(),
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
      expect(globalThis.browser.storage.local.get).toHaveBeenCalledWith([
        "collections",
        "mostRecentlyUpdatedCollections",
      ]);
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

  describe("Add Collection User Stories", () => {
    describe("User Story 1: Add Collection Button Shows Alert Dialog", () => {
      it("should show alert dialog when user clicks the add collection button", async () => {
        // Mock window.prompt
        const mockPrompt = vi.fn().mockReturnValue(null);
        globalThis.window.prompt = mockPrompt;

        render(() => <App />);

        // Wait for data to load
        await waitFor(() => {
          expect(globalThis.browser.storage.local.get).toHaveBeenCalled();
        });

        // Find and click the Add Collection button
        const addButton = await screen.findByRole("button", {
          name: /add collection/i,
        });
        fireEvent.click(addButton);

        // User should see an alert dialog to input text for collection name
        expect(mockPrompt).toHaveBeenCalledWith("Enter collection name:");
        expect(mockPrompt).toHaveBeenCalledTimes(1);
      });

      it("should not add collection when user cancels the dialog", async () => {
        // Mock window.prompt to return null (user cancels)
        const mockPrompt = vi.fn().mockReturnValue(null);
        globalThis.window.prompt = mockPrompt;

        render(() => <App />);

        // Wait for data to load
        await waitFor(() => {
          expect(globalThis.browser.storage.local.get).toHaveBeenCalled();
        });

        // Click the Add Collection button
        const addButton = await screen.findByRole("button", {
          name: /add collection/i,
        });
        fireEvent.click(addButton);

        // Verify prompt was called but storage.set was not called for new collection
        expect(mockPrompt).toHaveBeenCalled();

        // Only the initial get call should have been made, no set call for new collection
        expect(globalThis.browser.storage.local.set).not.toHaveBeenCalled();
      });
    });

    describe("User Story 2: User Inputs 'collection 1' and Collection Becomes Visible", () => {
      it("should add and display 'collection 1' when user inputs that name", async () => {
        // Mock window.prompt to return "collection 1"
        const mockPrompt = vi.fn().mockReturnValue("collection 1");
        globalThis.window.prompt = mockPrompt;

        render(() => <App />);

        // Wait for initial data to load
        await waitFor(() => {
          expect(globalThis.browser.storage.local.get).toHaveBeenCalled();
        });

        // Verify initial collections are displayed
        expect(await screen.findByText("Work")).toBeInTheDocument();
        expect(await screen.findByText("Personal")).toBeInTheDocument();

        // Click the Add Collection button
        const addButton = await screen.findByRole("button", {
          name: /add collection/i,
        });
        fireEvent.click(addButton);

        // User inputs "collection 1" as the collection name
        expect(mockPrompt).toHaveBeenCalledWith("Enter collection name:");

        // Wait for the new collection to be stored and the UI to update
        await waitFor(() => {
          expect(globalThis.browser.storage.local.set).toHaveBeenCalled();
        });

        // The collection name should be visible in the collections panel
        await waitFor(() => {
          expect(screen.getByText("collection 1")).toBeInTheDocument();
        });
      });

      it("should add multiple collections and display them all", async () => {
        const collectionNames = ["collection 1", "collection 2", "My Books"];
        let promptCallCount = 0;

        const mockPrompt = vi.fn().mockImplementation(() => {
          return collectionNames[promptCallCount++] || null;
        });
        globalThis.window.prompt = mockPrompt;

        render(() => <App />);

        await waitFor(() => {
          expect(globalThis.browser.storage.local.get).toHaveBeenCalled();
        });

        const addButton = await screen.findByRole("button", {
          name: /add collection/i,
        });

        // Add each collection
        for (const name of collectionNames) {
          fireEvent.click(addButton);

          await waitFor(() => {
            expect(screen.getByText(name)).toBeInTheDocument();
          });
        }

        // Verify all collections are visible
        for (const name of collectionNames) {
          expect(screen.getByText(name)).toBeInTheDocument();
        }

        // Verify original collections are still there
        expect(screen.getByText("Work")).toBeInTheDocument();
        expect(screen.getByText("Personal")).toBeInTheDocument();
      });

      it("should trim whitespace from collection name before adding", async () => {
        const mockPrompt = vi.fn().mockReturnValue("  collection 1  ");
        globalThis.window.prompt = mockPrompt;

        render(() => <App />);

        await waitFor(() => {
          expect(globalThis.browser.storage.local.get).toHaveBeenCalled();
        });

        const addButton = await screen.findByRole("button", {
          name: /add collection/i,
        });
        fireEvent.click(addButton);

        // The trimmed collection name should be visible
        await waitFor(() => {
          expect(screen.getByText("collection 1")).toBeInTheDocument();
        });

        // Verify no collection with untrimmed name exists
        expect(screen.queryByText("  collection 1  ")).not.toBeInTheDocument();
      });

      it("should handle special characters in collection names", async () => {
        const specialName = "Collection! @#$%^&*()_+-={}[]|\\:;\"'<>?,./ 1";
        const mockPrompt = vi.fn().mockReturnValue(specialName);
        globalThis.window.prompt = mockPrompt;

        render(() => <App />);

        await waitFor(() => {
          expect(globalThis.browser.storage.local.get).toHaveBeenCalled();
        });

        const addButton = await screen.findByRole("button", {
          name: /add collection/i,
        });
        fireEvent.click(addButton);

        await waitFor(() => {
          expect(screen.getByText(specialName)).toBeInTheDocument();
        });
      });

      it("should not add duplicate collection when name already exists at top level", async () => {
        const mockPrompt = vi.fn().mockReturnValue("Work");
        globalThis.window.prompt = mockPrompt;

        render(() => <App />);

        await waitFor(() => {
          expect(globalThis.browser.storage.local.get).toHaveBeenCalled();
        });

        // Verify "Work" collection already exists in the mock data
        expect(screen.getByText("Work")).toBeInTheDocument();

        const addButton = await screen.findByRole("button", {
          name: /add collection/i,
        });
        fireEvent.click(addButton);

        // Should not create a duplicate - storage.set should not be called for new collection
        expect(globalThis.browser.storage.local.set).not.toHaveBeenCalled();
      });

      it("should not add duplicate collection when name already exists in selected collection", async () => {
        const mockPrompt = vi.fn().mockReturnValue("Projects");
        globalThis.window.prompt = mockPrompt;

        render(() => <App />);

        await waitFor(() => {
          expect(globalThis.browser.storage.local.get).toHaveBeenCalled();
        });

        // First select the "Work" collection to expand it
        const workCollection = screen.getByText("Work");
        fireEvent.click(workCollection);

        await waitFor(() => {
          // Verify "Projects" is visible as a subcollection under Work
          expect(screen.getByText("Projects")).toBeInTheDocument();
        });

        const addButton = await screen.findByRole("button", {
          name: /add collection/i,
        });
        fireEvent.click(addButton);

        // Should not create a duplicate subcollection - storage.set should not be called for new collection
        expect(globalThis.browser.storage.local.set).not.toHaveBeenCalled();
      });

      it("should not add duplicate collection with different case", async () => {
        const mockPrompt = vi.fn().mockReturnValue("work");
        globalThis.window.prompt = mockPrompt;

        render(() => <App />);

        await waitFor(() => {
          expect(globalThis.browser.storage.local.get).toHaveBeenCalled();
        });

        // Verify "Work" collection already exists in the mock data (case sensitive)
        expect(screen.getByText("Work")).toBeInTheDocument();

        const addButton = await screen.findByRole("button", {
          name: /add collection/i,
        });
        fireEvent.click(addButton);

        // Should not create a duplicate with different case - storage.set should not be called for new collection
        expect(globalThis.browser.storage.local.set).not.toHaveBeenCalled();
      });

      it("should not add duplicate collection with extra whitespace", async () => {
        const mockPrompt = vi.fn().mockReturnValue("  Work  ");
        globalThis.window.prompt = mockPrompt;

        render(() => <App />);

        await waitFor(() => {
          expect(globalThis.browser.storage.local.get).toHaveBeenCalled();
        });

        // Verify "Work" collection already exists in the mock data
        expect(screen.getByText("Work")).toBeInTheDocument();

        const addButton = await screen.findByRole("button", {
          name: /add collection/i,
        });
        fireEvent.click(addButton);

        // Should not create a duplicate with whitespace - storage.set should not be called for new collection
        expect(globalThis.browser.storage.local.set).not.toHaveBeenCalled();
      });

      it("should not add duplicate subcollection with different case and whitespace", async () => {
        const mockPrompt = vi.fn().mockReturnValue("  PROJECTS  ");
        globalThis.window.prompt = mockPrompt;

        render(() => <App />);

        await waitFor(() => {
          expect(globalThis.browser.storage.local.get).toHaveBeenCalled();
        });

        // First select the "Work" collection to expand it
        const workCollection = screen.getByText("Work");
        fireEvent.click(workCollection);

        await waitFor(() => {
          // Verify "Projects" is visible as a subcollection under Work
          expect(screen.getByText("Projects")).toBeInTheDocument();
        });

        const addButton = await screen.findByRole("button", {
          name: /add collection/i,
        });
        fireEvent.click(addButton);

        // Should not create a duplicate subcollection with different case and whitespace
        expect(globalThis.browser.storage.local.set).not.toHaveBeenCalled();
      });

      describe("Tab Import Functionality", () => {
        beforeEach(() => {
          // Set up a more detailed mock tab for import testing
          globalThis.browser.tabs.query = vi.fn().mockResolvedValue([
            {
              id: 1,
              url: "https://github.com/example/repo",
              title: "GitHub Example Repository",
              active: true,
              favIconUrl: "https://github.com/favicon.ico",
            },
          ]);
        });

        it("should import selected tab and display it when collection is selected and import button is clicked", async () => {
          render(() => <App />);

          // Wait for data to load
          await waitFor(() => {
            expect(globalThis.browser.storage.local.get).toHaveBeenCalled();
          });

          // Select the "Work" collection
          const workCollection = await screen.findByText("Work");
          fireEvent.click(workCollection);

          // Wait for collection to be selected and import button to be enabled
          const importButton = await screen.findByRole("button", {
            name: /import tab/i,
          });
          await waitFor(() => {
            expect(importButton).not.toBeDisabled();
          });

          // Click the import button
          fireEvent.click(importButton);

          // Wait for the tab to be imported and displayed
          // TODO: fix this, potentially brittle. Shouldn't check what the function query is called with
          await waitFor(() => {
            expect(globalThis.browser.tabs.query).toHaveBeenCalledWith({
              currentWindow: true,
              highlighted: true,
            });
          });

          // Verify the imported tab name is displayed
          await waitFor(() => {
            expect(
              screen.getByText("GitHub Example Repository"),
            ).toBeInTheDocument();
          });

          // Verify the origin (domain) of the tab's URL is displayed
          await waitFor(() => {
            expect(screen.getByText("github.com")).toBeInTheDocument();
          });

          // Verify that storage was updated with the new bookmark
          expect(globalThis.browser.storage.local.set).toHaveBeenCalled();
        });

        it("should display the import date for the imported tab", async () => {
          // Mock Date.now to return a fixed timestamp for consistent testing
          const mockDate = new Date("2024-01-15T10:30:00Z");
          vi.useFakeTimers();
          vi.setSystemTime(mockDate);

          render(() => <App />);

          await waitFor(() => {
            expect(globalThis.browser.storage.local.get).toHaveBeenCalled();
          });

          // Select collection and import tab
          const workCollection = await screen.findByText("Work");
          fireEvent.click(workCollection);

          const importButton = await screen.findByRole("button", {
            name: /import tab/i,
          });
          await waitFor(() => {
            expect(importButton).not.toBeDisabled();
          });

          fireEvent.click(importButton);

          // Wait for import to complete
          await waitFor(() => {
            expect(globalThis.browser.tabs.query).toHaveBeenCalled();
          });

          // Check that the date is displayed (format may vary, but should contain date info)
          await waitFor(() => {
            // Look for date-like text patterns
            // TODO: see if this is a good way to check for date elements
            const dateElements = screen.getAllByText(/Jan|15|2024|1\/15\/2024/);
            expect(dateElements.length).toBeGreaterThan(0);
          });

          vi.useRealTimers();
        });

        it("should handle multiple tab imports to the same collection", async () => {
          // Mock multiple tabs
          globalThis.browser.tabs.query = vi.fn().mockResolvedValueOnce([
            {
              id: 1,
              url: "https://github.com/example/repo1",
              title: "First Repository",
              active: true,
              highlighted: true,
            },
            {
              id: 2,
              url: "https://stackoverflow.com/questions/123",
              title: "Stack Overflow Question",
              highlighted: true,
            },
          ]);

          render(() => <App />);

          await waitFor(() => {
            expect(globalThis.browser.storage.local.get).toHaveBeenCalled();
          });

          // Select collection
          const workCollection = await screen.findByText("Work");
          fireEvent.click(workCollection);

          const importButton = await screen.findByRole("button", {
            name: /import tab/i,
          });

          // Import both tabs
          fireEvent.click(importButton);

          await waitFor(() => {
            expect(screen.getByText("First Repository")).toBeInTheDocument();
          });

          await waitFor(() => {
            expect(
              screen.getByText("Stack Overflow Question"),
            ).toBeInTheDocument();
          });

          // Both tabs should be visible
          expect(screen.getByText("First Repository")).toBeInTheDocument();
          expect(
            screen.getByText("Stack Overflow Question"),
          ).toBeInTheDocument();
          expect(screen.getByText("github.com")).toBeInTheDocument();
          expect(screen.getByText("stackoverflow.com")).toBeInTheDocument();
        });

        it("should not import duplicate bookmark with same URL", async () => {
          // Mock a tab with URL that already exists in the Work collection
          globalThis.browser.tabs.query = vi.fn().mockResolvedValue([
            {
              id: 1,
              url: "https://work.example.com",
              title: "Another Work Item",
              active: true,
              highlighted: true,
            },
          ]);

          render(() => <App />);

          await waitFor(() => {
            expect(globalThis.browser.storage.local.get).toHaveBeenCalled();
          });

          // Select the "Work" collection which already has a bookmark with URL "https://work.example.com"
          const workCollection = await screen.findByText("Work");
          fireEvent.click(workCollection);

          // Verify existing bookmark is displayed
          await waitFor(() => {
            expect(screen.getByText("Example Work Item")).toBeInTheDocument();
          });

          // Count initial bookmarks
          const initialWorkDomainElements =
            screen.getAllByText("work.example.com");
          const initialBookmarkCount = initialWorkDomainElements.length;
          await waitFor(() => {
            expect(screen.getByText("Example Work Item")).toBeInTheDocument();
          });

          const importButton = await screen.findByRole("button", {
            name: /import tab/i,
          });

          await waitFor(() => {
            expect(importButton).not.toBeDisabled();
          });

          // Try to import tab with duplicate URL
          fireEvent.click(importButton);

          await waitFor(() => {
            expect(globalThis.browser.tabs.query).toHaveBeenCalled();
          });

          // Should not add the duplicate bookmark - storage.set should not be called again
          // since we're preventing duplicates based on URL
          await waitFor(() => {
            expect(globalThis.browser.storage.local.set).not.toHaveBeenCalled();
          });

          await waitFor(() => {
            expect(screen.getByText("Example Work Item")).toBeInTheDocument();
          });

          // Should not display the duplicate bookmark title
          expect(
            screen.queryByText("Another Work Item"),
          ).not.toBeInTheDocument();
        });

        it("should not import duplicate bookmark with slightly different URL format", async () => {
          // Mock a tab with URL that has different format but same resource (trailing slash)
          globalThis.browser.tabs.query = vi.fn().mockResolvedValue([
            {
              id: 1,
              url: "https://work.example.com/",
              title: "Work Item with Trailing Slash",
              active: true,
              highlighted: true,
            },
          ]);

          render(() => <App />);

          await waitFor(() => {
            expect(globalThis.browser.storage.local.get).toHaveBeenCalled();
          });

          // Select the "Work" collection which already has a bookmark with URL "https://work.example.com"
          const workCollection = await screen.findByText("Work");
          fireEvent.click(workCollection);

          // Verify existing bookmark is displayed
          await waitFor(() => {
            expect(screen.getByText("Example Work Item")).toBeInTheDocument();
          });

          const importButton = await screen.findByRole("button", {
            name: /import tab/i,
          });

          await waitFor(() => {
            expect(importButton).not.toBeDisabled();
          });

          // Try to import tab with slightly different URL format (trailing slash)
          fireEvent.click(importButton);

          await waitFor(() => {
            expect(globalThis.browser.tabs.query).toHaveBeenCalled();
          });

          await waitFor(() => {
            expect(globalThis.browser.storage.local.set).not.toHaveBeenCalled();
          });

          await waitFor(() => {
            expect(screen.getByText("Example Work Item")).toBeInTheDocument();
          });

          // Should not display the duplicate bookmark title
          expect(
            screen.queryByText("Work Item with Trailing Slash"),
          ).not.toBeInTheDocument();
        });

        it("should show error toast when tab import fails", async () => {
          // Mock tabs.query to fail
          globalThis.browser.tabs.query = vi
            .fn()
            .mockRejectedValue(new Error("Tab access denied"));

          render(() => <App />);

          await waitFor(() => {
            expect(globalThis.browser.storage.local.get).toHaveBeenCalled();
          });

          // Select collection and try to import
          const workCollection = await screen.findByText("Work");
          fireEvent.click(workCollection);

          const importButton = await screen.findByRole("button", {
            name: /import tab/i,
          });
          await waitFor(() => {
            expect(importButton).not.toBeDisabled();
          });

          fireEvent.click(importButton);

          // Wait for error to occur and error toast to appear
          await waitFor(() => {
            expect(
              screen.getByText("Failed to save selected tab(s)."),
            ).toBeInTheDocument();
          });
        });

        it("should preserve existing bookmarks when importing new tabs", async () => {
          render(() => <App />);

          await waitFor(() => {
            expect(globalThis.browser.storage.local.get).toHaveBeenCalled();
          });

          // Select the Work collection which already has "Example Work Item"
          const workCollection = await screen.findByText("Work");
          fireEvent.click(workCollection);

          // Should see the existing bookmark
          await waitFor(() => {
            expect(screen.getByText("Example Work Item")).toBeInTheDocument();
          });

          // Import a new tab
          const importButton = await screen.findByRole("button", {
            name: /import tab/i,
          });
          fireEvent.click(importButton);

          // Wait for import to complete
          await waitFor(() => {
            expect(
              screen.getByText("GitHub Example Repository"),
            ).toBeInTheDocument();
          });

          // Both the existing and new bookmark should be visible
          expect(screen.getByText("Example Work Item")).toBeInTheDocument();
          expect(
            screen.getByText("GitHub Example Repository"),
          ).toBeInTheDocument();
        });

        it("should hide bookmarks when collection is deselected", async () => {
          render(() => <App />);

          await waitFor(() => {
            expect(globalThis.browser.storage.local.get).toHaveBeenCalled();
          });

          // Select the Work collection which has existing bookmarks
          const workCollection = await screen.findByText("Work");
          fireEvent.click(workCollection);

          // Wait for collection to be selected and bookmarks to be displayed
          await waitFor(() => {
            expect(screen.getByText("Example Work Item")).toBeInTheDocument();
          });

          // Verify the bookmark is visible
          expect(screen.getByText("Example Work Item")).toBeInTheDocument();

          // Deselect the collection by clicking it again
          fireEvent.click(workCollection);

          // Wait for deselection to take effect and bookmarks to be hidden
          await waitFor(() => {
            expect(
              screen.queryByText("Example Work Item"),
            ).not.toBeInTheDocument();
          });

          // Verify the bookmark is no longer visible
          expect(
            screen.queryByText("Example Work Item"),
          ).not.toBeInTheDocument();

          // Verify import button is disabled again
          const importButton = screen.getByRole("button", {
            name: /import tab/i,
          });
          expect(importButton).toBeDisabled();
        });

        it("should show bookmarks when clicking on an unselected collection", async () => {
          render(() => <App />);

          await waitFor(() => {
            expect(globalThis.browser.storage.local.get).toHaveBeenCalled();
          });

          // Initially no collection is selected, so no bookmarks should be visible
          expect(
            screen.queryByText("Example Work Item"),
          ).not.toBeInTheDocument();
          expect(
            screen.queryByText("Example Personal Item"),
          ).not.toBeInTheDocument();

          // Click on the "Work" collection to select it
          const workCollection = await screen.findByText("Work");
          fireEvent.click(workCollection);

          // Wait for the collection to be selected and its bookmarks to appear
          await waitFor(() => {
            expect(screen.getByText("Example Work Item")).toBeInTheDocument();
          });

          // Verify the Work collection's bookmark is now visible
          expect(screen.getByText("Example Work Item")).toBeInTheDocument();

          // Verify the Personal collection's bookmark is still not visible
          expect(
            screen.queryByText("Example Personal Item"),
          ).not.toBeInTheDocument();

          // Now click on the "Personal" collection
          const personalCollection = await screen.findByText("Personal");
          fireEvent.click(personalCollection);

          // Wait for the Personal collection to be selected and its bookmarks to appear
          await waitFor(() => {
            expect(
              screen.getByText("Example Personal Item"),
            ).toBeInTheDocument();
          });

          // Verify the Personal collection's bookmark is now visible
          expect(screen.getByText("Example Personal Item")).toBeInTheDocument();

          // Verify the Work collection's bookmark is no longer visible (since Personal is now selected)
          expect(
            screen.queryByText("Example Work Item"),
          ).not.toBeInTheDocument();
        });

        it("should switch bookmark visibility when changing from one selected collection to another", async () => {
          render(() => <App />);

          await waitFor(() => {
            expect(globalThis.browser.storage.local.get).toHaveBeenCalled();
          });

          // Start by selecting the "Work" collection
          const workCollection = await screen.findByText("Work");
          fireEvent.click(workCollection);

          // Wait for Work collection bookmarks to be displayed
          await waitFor(() => {
            expect(screen.getByText("Example Work Item")).toBeInTheDocument();
          });

          // Verify Work collection bookmark is visible and Personal is not
          expect(screen.getByText("Example Work Item")).toBeInTheDocument();
          expect(
            screen.queryByText("Example Personal Item"),
          ).not.toBeInTheDocument();

          // Now switch to the "Personal" collection
          const personalCollection = await screen.findByText("Personal");
          fireEvent.click(personalCollection);

          // Wait for Personal collection bookmarks to be displayed
          await waitFor(() => {
            expect(
              screen.getByText("Example Personal Item"),
            ).toBeInTheDocument();
          });

          // Verify Personal collection bookmark is now visible
          expect(screen.getByText("Example Personal Item")).toBeInTheDocument();

          // Verify Work collection bookmark is no longer visible
          expect(
            screen.queryByText("Example Work Item"),
          ).not.toBeInTheDocument();

          // Verify import button is still enabled (since a collection is selected)
          const importButton = screen.getByRole("button", {
            name: /import tab/i,
          });
          expect(importButton).not.toBeDisabled();
        });

        it("should remove bookmark from view when delete button with trash icon is clicked", async () => {
          render(() => <App />);

          await waitFor(() => {
            expect(globalThis.browser.storage.local.get).toHaveBeenCalled();
          });

          // Select the "Work" collection which has "Example Work Item" bookmark
          const workCollection = await screen.findByText("Work");
          fireEvent.click(workCollection);

          // Wait for the bookmark to be displayed
          await waitFor(() => {
            expect(screen.getByText("Example Work Item")).toBeInTheDocument();
          });

          // Verify the bookmark is initially visible
          expect(screen.getByText("Example Work Item")).toBeInTheDocument();

          // Find and click the delete button with trash icon
          const deleteButton = screen.getByRole("button", {
            name: "Delete Bookmark",
          });
          fireEvent.click(deleteButton);

          // Wait for the bookmark to be removed from the UI
          await waitFor(() => {
            expect(
              screen.queryByText("Example Work Item"),
            ).not.toBeInTheDocument();
          });

          // Verify the bookmark is no longer visible
          expect(
            screen.queryByText("Example Work Item"),
          ).not.toBeInTheDocument();

          // Verify storage was updated (delete operation called storage.set)
          expect(globalThis.browser.storage.local.set).toHaveBeenCalled();
        });

        it("should show subcollections when parent collection is selected and hide them when deselected", async () => {
          render(() => <App />);

          await waitFor(() => {
            expect(globalThis.browser.storage.local.get).toHaveBeenCalled();
          });

          // Initially, subcollections should not be visible
          expect(screen.queryByText("Projects")).not.toBeInTheDocument();
          expect(screen.queryByText("Documentation")).not.toBeInTheDocument();

          // Select the "Work" collection which has subcollections
          const workCollection = await screen.findByText("Work");
          fireEvent.click(workCollection);

          // Wait for the collection to be selected and subcollections to appear
          await waitFor(() => {
            expect(screen.getByText("Projects")).toBeInTheDocument();
          });

          // Verify both subcollections are now visible
          expect(screen.getByText("Projects")).toBeInTheDocument();
          expect(screen.getByText("Documentation")).toBeInTheDocument();

          // Deselect the collection by clicking it again
          fireEvent.click(workCollection);

          // Wait for subcollections to be hidden
          await waitFor(() => {
            expect(screen.queryByText("Projects")).not.toBeInTheDocument();
          });

          // Verify both subcollections are no longer visible
          expect(screen.queryByText("Projects")).not.toBeInTheDocument();
          expect(screen.queryByText("Documentation")).not.toBeInTheDocument();
        });
      });
    });

    describe("Collection Deletion", () => {
      it("should show delete button only when a collection is selected", async () => {
        render(() => <App />);

        // Wait for collections to load
        await waitFor(() => {
          expect(screen.getByText("Work")).toBeInTheDocument();
        });

        // Initially no delete button should be visible
        expect(
          screen.queryByLabelText("Delete Collection"),
        ).not.toBeInTheDocument();

        // Select a collection
        fireEvent.click(screen.getByText("Work"));

        // Delete button should now be visible
        await waitFor(() => {
          expect(
            screen.getByLabelText("Delete Collection"),
          ).toBeInTheDocument();
        });
      });

      it("should not show delete button when no collection is selected", async () => {
        render(() => <App />);

        // Wait for collections to load
        await waitFor(() => {
          expect(screen.getByText("Work")).toBeInTheDocument();
        });

        // No collection selected - delete button should not be visible
        expect(
          screen.queryByLabelText("Delete Collection"),
        ).not.toBeInTheDocument();
      });

      it("should show confirmation modal when delete button is clicked", async () => {
        render(() => <App />);

        // Wait for collections to load
        await waitFor(() => {
          expect(screen.getByText("Work")).toBeInTheDocument();
        });

        // Select the Work collection
        fireEvent.click(screen.getByText("Work"));

        // Click delete button
        const deleteButton = await waitFor(() => {
          return screen.getByRole("button", { name: "Delete Collection" });
        });
        fireEvent.click(deleteButton);

        // Modal should appear with confirmation dialog
        await waitFor(() => {
          expect(screen.getByRole("dialog")).toBeInTheDocument();
          expect(
            screen.getByText(/Are you sure you want to delete the collection/),
          ).toBeInTheDocument();
          expect(screen.getByText(/"Work"/)).toBeInTheDocument();
          expect(
            screen.getByText(/To confirm, type the collection name exactly/),
          ).toBeInTheDocument();
        });

        expect(
          screen.getByRole("button", { name: "Cancel" }),
        ).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: "Confirm Delete" }),
        ).toBeInTheDocument();
      });

      it("should disable delete confirmation button when collection name doesn't match", async () => {
        render(() => <App />);

        // Wait for collections to load
        await waitFor(() => {
          expect(screen.getByText("Work")).toBeInTheDocument();
        });

        // Select the Work collection
        fireEvent.click(screen.getByText("Work"));

        // Click delete button to open modal
        const deleteButton = await waitFor(() => {
          return screen.getByLabelText("Delete Collection");
        });
        fireEvent.click(deleteButton);

        // Wait for modal to appear
        await waitFor(() => {
          expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

        const confirmButton = screen.getByRole("button", {
          name: "Confirm Delete",
        });

        // Initially button should be disabled
        expect(confirmButton).toBeDisabled();

        const input = screen.getByLabelText(
          "To confirm, type the collection name exactly as shown above:",
        );

        // Type incorrect name
        fireEvent.input(input, { target: { value: "wrong name" } });
        expect(confirmButton).toBeDisabled();

        // Type partial correct name
        fireEvent.input(input, { target: { value: "Wor" } });
        expect(confirmButton).toBeDisabled();

        // Type correct name with extra spaces
        fireEvent.input(input, { target: { value: " Work " } });
        expect(confirmButton).toBeDisabled();

        // Type exact correct name
        fireEvent.input(input, { target: { value: "Work" } });
        expect(confirmButton).not.toBeDisabled();
      });

      it("should cancel deletion when cancel button is clicked", async () => {
        render(() => <App />);

        // Wait for collections to load
        await waitFor(() => {
          expect(screen.getByText("Work")).toBeInTheDocument();
        });

        // Select the Work collection
        fireEvent.click(screen.getByText("Work"));

        // Click delete button to open modal
        const deleteButton = await waitFor(() => {
          return screen.getByLabelText("Delete Collection");
        });
        fireEvent.click(deleteButton);

        // Wait for modal to appear
        await waitFor(() => {
          expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

        // Click cancel button
        const cancelButton = screen.getByRole("button", { name: "Cancel" });
        fireEvent.click(cancelButton);

        // Modal should disappear and collection should still exist
        await waitFor(() => {
          expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });
        expect(screen.getAllByText("Work").length).toBeGreaterThan(0);
      });

      it("should cancel deletion when X button is clicked", async () => {
        render(() => <App />);

        // Wait for collections to load
        await waitFor(() => {
          expect(screen.getByText("Work")).toBeInTheDocument();
        });

        // Select the Work collection
        fireEvent.click(screen.getByText("Work"));

        // Click delete button to open modal
        const deleteButton = await waitFor(() => {
          return screen.getByLabelText("Delete Collection");
        });
        fireEvent.click(deleteButton);

        // Wait for modal to appear
        await waitFor(() => {
          expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

        // Click X button in top corner
        const closeButton = screen.getByText("✕");
        fireEvent.click(closeButton);

        // Modal should disappear and collection should still exist
        await waitFor(() => {
          expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });
        expect(screen.getAllByText("Work").length).toBeGreaterThan(0);
      });

      it("should delete collection and hide its children when correct name is entered and confirmed", async () => {
        render(() => <App />);

        // Wait for collections to load
        await waitFor(() => {
          expect(screen.getByText("Work")).toBeInTheDocument();
          expect(screen.getByText("Personal")).toBeInTheDocument();
        });

        // Select the Work collection (which has subcollections)
        fireEvent.click(screen.getByText("Work"));

        // Verify subcollections are visible
        await waitFor(() => {
          expect(screen.getByText("Projects")).toBeInTheDocument();
          expect(screen.getByText("Documentation")).toBeInTheDocument();
        });

        // Click delete button to open modal
        const deleteButton = await waitFor(() => {
          return screen.getByLabelText("Delete Collection");
        });
        fireEvent.click(deleteButton);

        // Wait for modal to appear
        await waitFor(() => {
          expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

        // Type correct collection name and confirm deletion
        const input = screen.getByLabelText(
          "To confirm, type the collection name exactly as shown above:",
        );
        // Type correct collection name
        fireEvent.input(input, { target: { value: "Work" } });

        // Click confirm delete button
        const confirmButton = screen.getByRole("button", {
          name: "Confirm Delete",
        });
        fireEvent.click(confirmButton);

        // Work collection and its children should no longer be visible
        await waitFor(() => {
          expect(screen.queryByText("Work")).not.toBeInTheDocument();
          expect(screen.queryByText("Projects")).not.toBeInTheDocument();
          expect(screen.queryByText("Documentation")).not.toBeInTheDocument();
        });

        // Personal collection should still be visible
        expect(screen.getByText("Personal")).toBeInTheDocument();

        // Delete button should no longer be visible since no collection is selected
        expect(
          screen.queryByLabelText("Delete Collection"),
        ).not.toBeInTheDocument();
      });

      it("should keep ancestor collections expanded when deleting a subcollection", async () => {
        render(() => <App />);

        // Wait for collections to load
        await waitFor(() => {
          expect(screen.getByText("Work")).toBeInTheDocument();
        });

        // Select the Work collection to expand it and see subcollections
        fireEvent.click(screen.getByText("Work"));

        await waitFor(() => {
          expect(screen.getByText("Projects")).toBeInTheDocument();
          expect(screen.getByText("Documentation")).toBeInTheDocument();
        });

        // Select the Projects subcollection
        fireEvent.click(screen.getByText("Projects"));

        // Verify the delete button appears for Projects
        const deleteButton = await waitFor(() => {
          return screen.getByLabelText("Delete Collection");
        });

        // Click delete button to open modal
        fireEvent.click(deleteButton);

        // Wait for modal to appear
        await waitFor(() => {
          expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

        // Type correct collection name and confirm deletion
        const input = screen.getByLabelText(
          "To confirm, type the collection name exactly as shown above:",
        );
        fireEvent.input(input, { target: { value: "Projects" } });

        const confirmButton = screen.getByRole("button", {
          name: "Confirm Delete",
        });
        fireEvent.click(confirmButton);

        // Projects should be deleted but Work should still be expanded with Documentation visible
        await waitFor(() => {
          expect(screen.queryByText("Projects")).not.toBeInTheDocument();
          expect(screen.getByText("Work")).toBeInTheDocument();
          expect(screen.getByText("Documentation")).toBeInTheDocument();
        });
      });
    });
  });
});
