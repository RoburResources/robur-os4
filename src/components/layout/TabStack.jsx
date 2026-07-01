import { createContext, useState, useCallback, useContext } from 'react';

const TabStackContext = createContext();

export const useTabStack = () => {
  const context = useContext(TabStackContext);
  if (!context) {
    throw new Error('useTabStack must be used within TabStackProvider');
  }
  return context;
};

export function TabStackProvider({ children }) {
  const [tabHistories, setTabHistories] = useState({
    '/': ['/'],
    '/jobs': ['/jobs'],
    '/fleet': ['/fleet'],
    '/documents': ['/documents'],
    '/clients': ['/clients'],
  });
  const [activeTab, setActiveTab] = useState('/');

  const pushToTab = useCallback((tabPath, newPath) => {
    setTabHistories(prev => {
      const currentStack = prev[tabPath] || [tabPath];
      const lastPath = currentStack[currentStack.length - 1];
      
      // If navigating to the same path, don't add to stack
      if (lastPath === newPath) return prev;
      
      return {
        ...prev,
        [tabPath]: [...currentStack, newPath]
      };
    });
  }, []);

  const popFromTab = useCallback((tabPath) => {
    setTabHistories(prev => {
      const currentStack = prev[tabPath] || [tabPath];
      if (currentStack.length <= 1) return prev; // Don't pop below root
      
      return {
        ...prev,
        [tabPath]: currentStack.slice(0, -1)
      };
    });
  }, []);

  const resetTab = useCallback((tabPath) => {
    setTabHistories(prev => ({
      ...prev,
      [tabPath]: [tabPath]
    }));
  }, []);

  const getTabStack = useCallback((tabPath) => {
    return tabHistories[tabPath] || [tabPath];
  }, [tabHistories]);

  const getCurrentTabPath = useCallback((tabPath) => {
    const stack = tabHistories[tabPath] || [tabPath];
    return stack[stack.length - 1];
  }, [tabHistories]);

  return (
    <TabStackContext.Provider
      value={{
        tabHistories,
        activeTab,
        setActiveTab,
        pushToTab,
        popFromTab,
        resetTab,
        getTabStack,
        getCurrentTabPath,
      }}
    >
      {children}
    </TabStackContext.Provider>
  );
}