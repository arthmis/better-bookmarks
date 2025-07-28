import { render, screen, fireEvent, waitFor } from "@solidjs/testing-library";
import { vi, describe, it, expect, beforeEach } from "vitest";
import BrowserBookmarks from "./BrowserBookmarks";
import { Collection } from "./Collections";

// Mock browser bookmarks API
const mockBrowserBookmarks = [
  {
    id: "root________",
    title: "",
    children: [
      {
        id: "toolbar_____",
        title: "Bookmarks Toolbar",
        type: "folder",
        children: [
          {
            id: "bookmark_1",
            title: "Example Site",
            url: "https://example.com",
            type: "bookmark",
            dateAdded: Date.now(),
          },
          {
            id: "folder_1",
            title: "Development",
            type: "folder",
            children: [
              {
                id: "bookmark_2",
                title: "MDN Web Docs",
                url: "https://developer.mozilla.org",
                type: "bookmark",
                dateAdded: Date.now(),
              },
            ],
          },
        ],
      },
      {
        id: "menu________",
        title: "Bookmarks Menu",
        type: "folder",
        children: [
          {
            id: "bookmark_3",
            title: "GitHub",
            url: "https://github.com",
            type: "bookmark",
            dateAdded: Date.now(),
          },
        ],
      },
    ],
  },
];

const mockExistingCollections: Collection[] = [
  {
    id: "1",
    name: "Work",
    items: [
      {
        id: "1",
        title: "Work Item",
        url: "https://work.example.com",
        iconUrl: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    subcollections: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe("BrowserBookmarks Component", () => {
  beforeEach(() => {
    // Mock the browser bookmarks API
    globalThis.browser = {
      bookmarks: {
        getTree: vi.fn().mockResolvedValue(mockBrowserBookmarks),
      },
    } as any;
  });

  it("should render the modal with header and close button", async () => {
    const mockOnClose = vi.fn();
    const mockOnImportCollections = vi.fn();

    render(() => (
      <BrowserBookmarks
        onClose={mockOnClose}
        collections={mockExistingCollections}
        onImportCollections={mockOnImportCollections}
      />
    ));

    // Check that the modal header is present
    expect(screen.getByText("Browser Bookmarks")).toBeInTheDocument();

    // Check that close button is present
    const closeButton = screen.getByLabelText("Close");
    expect(closeButton).toBeInTheDocument();

    // Test close functionality
    fireEvent.click(closeButton);
    // TODO: change to check message isn't visible
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("should display loading state initially", async () => {
    const mockOnClose = vi.fn();
    const mockOnImportCollections = vi.fn();

    render(() => (
      <BrowserBookmarks
        onClose={mockOnClose}
        collections={mockExistingCollections}
        onImportCollections={mockOnImportCollections}
      />
    ));

    // Should show loading state
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("should display browser bookmarks after loading", async () => {
    const mockOnClose = vi.fn();
    const mockOnImportCollections = vi.fn();

    render(() => (
      <BrowserBookmarks
        onClose={mockOnClose}
        collections={mockExistingCollections}
        onImportCollections={mockOnImportCollections}
      />
    ));

    // Wait for bookmarks to load
    await waitFor(() => {
      expect(screen.getByText("Bookmarks Toolbar")).toBeInTheDocument();
    });

    expect(screen.getByText("Bookmarks Menu")).toBeInTheDocument();
  });

  it("should show import information", async () => {
    const mockOnClose = vi.fn();
    const mockOnImportCollections = vi.fn();

    render(() => (
      <BrowserBookmarks
        onClose={mockOnClose}
        collections={mockExistingCollections}
        onImportCollections={mockOnImportCollections}
      />
    ));

    // Check that import information is displayed
    expect(
      screen.getByText(/Import your browser bookmarks into this app/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Duplicate URLs will be skipped automatically/),
    ).toBeInTheDocument();
  });

  it("should show bookmark count information", async () => {
    const mockOnClose = vi.fn();
    const mockOnImportCollections = vi.fn();

    render(() => (
      <BrowserBookmarks
        onClose={mockOnClose}
        collections={mockExistingCollections}
        onImportCollections={mockOnImportCollections}
      />
    ));

    // Wait for bookmarks to load and count to be calculated
    await waitFor(() => {
      expect(screen.getByText(/Found \d+ bookmarks/)).toBeInTheDocument();
    });
  });

  it("should handle import button click", async () => {
    const mockOnClose = vi.fn();
    const mockOnImportCollections = vi.fn().mockResolvedValue(undefined);

    render(() => (
      <BrowserBookmarks
        onClose={mockOnClose}
        collections={mockExistingCollections}
        onImportCollections={mockOnImportCollections}
      />
    ));

    // Wait for bookmarks to load
    await waitFor(() => {
      expect(screen.getByText("Bookmarks Toolbar")).toBeInTheDocument();
    });

    // Find and click import button
    const importButton = screen.getByText("Import Bookmarks");
    expect(importButton).toBeInTheDocument();

    fireEvent.click(importButton);

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText("Importing...")).toBeInTheDocument();
    });

    // Should call the import function
    // Look into avoiding checking if function was called
    await waitFor(() => {
      expect(mockOnImportCollections).toHaveBeenCalledTimes(1);
    });
  });

  it("should expand and collapse bookmark folders", async () => {
    const mockOnClose = vi.fn();
    const mockOnImportCollections = vi.fn();

    render(() => (
      <BrowserBookmarks
        onClose={mockOnClose}
        collections={mockExistingCollections}
        onImportCollections={mockOnImportCollections}
      />
    ));

    // Wait for bookmarks to load
    await waitFor(() => {
      expect(screen.getByText("Bookmarks Toolbar")).toBeInTheDocument();
    });

    // Click on Bookmarks Toolbar to expand
    const toolbarFolder = screen.getByText("Bookmarks Toolbar");
    fireEvent.click(toolbarFolder);

    // Should show expanded content
    await waitFor(() => {
      expect(screen.getByText("Example Site")).toBeInTheDocument();
      expect(screen.getByText("Development")).toBeInTheDocument();
    });

    // Click on Development folder to expand
    const devFolder = screen.getByText("Development");
    fireEvent.click(devFolder);

    // Should show nested bookmark
    await waitFor(() => {
      expect(screen.getByText("MDN Web Docs")).toBeInTheDocument();
    });
  });

  it("should handle browser API errors", async () => {
    // Mock browser API to throw an error
    globalThis.browser.bookmarks.getTree = vi
      .fn()
      .mockRejectedValue(new Error("Permission denied"));

    const mockOnClose = vi.fn();
    const mockOnImportCollections = vi.fn();

    render(() => (
      <BrowserBookmarks
        onClose={mockOnClose}
        collections={mockExistingCollections}
        onImportCollections={mockOnImportCollections}
      />
    ));

    // Should handle error gracefully (no error thrown, just no bookmarks shown)
    await waitFor(() => {
      // The component should still render, just without bookmarks
      expect(screen.getByText("Browser Bookmarks")).toBeInTheDocument();
    });
  });

  it("should disable import button when no bookmarks are available", async () => {
    // Mock empty bookmarks
    globalThis.browser.bookmarks.getTree = vi.fn().mockResolvedValue([
      {
        id: "root________",
        title: "",
        children: [],
      },
    ]);

    const mockOnClose = vi.fn();
    const mockOnImportCollections = vi.fn();

    render(() => (
      <BrowserBookmarks
        onClose={mockOnClose}
        collections={mockExistingCollections}
        onImportCollections={mockOnImportCollections}
      />
    ));

    // Wait for empty state
    await waitFor(() => {
      const importButton = screen.getByText("Import Bookmarks");
      expect(importButton).toBeDisabled();
    });
  });
});
