'use client';

import React, { useState, useEffect } from 'react';
import { promptCategories, PromptElement } from '@/lib/prompt-elements';
import './PromptBuilder.css';

interface PromptBuilderProps {
  currentPrompt: string;
  onUpdatePrompt: (prompt: string) => void;
  onClose: () => void;
}

export default function PromptBuilder({ currentPrompt, onUpdatePrompt, onClose }: PromptBuilderProps) {
  const [selectedElements, setSelectedElements] = useState<PromptElement[]>([]);
  
  // Try to parse existing prompt to initialize selection (basic string match)
  useEffect(() => {
    if (!currentPrompt) {
      setSelectedElements([]);
      return;
    }
    
    const matchedElements: PromptElement[] = [];
    promptCategories.forEach(category => {
      category.elements.forEach(element => {
        if (currentPrompt.includes(element.en) || currentPrompt.includes(element.name)) {
          matchedElements.push(element);
        }
      });
    });
    
    setSelectedElements(matchedElements);
  }, [currentPrompt]);

  const toggleElement = (element: PromptElement) => {
    const isSelected = selectedElements.some(e => e.id === element.id);
    let newSelection;
    
    if (isSelected) {
      newSelection = selectedElements.filter(e => e.id !== element.id);
    } else {
      newSelection = [...selectedElements, element];
    }
    
    setSelectedElements(newSelection);
    // Update text prompt safely outside setState callback
    updateTextPrompt(newSelection);
  };

  const updateTextPrompt = (elements: PromptElement[]) => {
    // Generate prompt by joining english text of selected elements
    const newPrompt = elements.map(e => e.en).join(', ');
    onUpdatePrompt(newPrompt);
  };

  const clearSelection = () => {
    setSelectedElements([]);
    onUpdatePrompt('');
  };

  return (
    <div className="prompt-builder-container">
      <div className="pb-header">
        <div className="pb-title">
          <span className="pb-icon">🧩</span> 知识图谱式构建器
        </div>
        <div className="pb-actions">
          <button className="pb-btn-text" onClick={clearSelection}>清除全部</button>
          <button className="pb-btn-close" onClick={onClose}>✕ 切换文本模式</button>
        </div>
      </div>

      <div className="pb-content">
        {promptCategories.map(category => (
          <div key={category.id} className="pb-category">
            <h4 className="pb-category-title">{category.title}</h4>
            <div className="pb-elements-grid">
              {category.elements.map(element => {
                const isSelected = selectedElements.some(e => e.id === element.id);
                return (
                  <button
                    key={element.id}
                    className={`pb-element ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleElement(element)}
                    title={element.en}
                  >
                    <span className="pb-el-emoji">{element.emoji}</span>
                    <span className="pb-el-name">{element.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      
      <div className="pb-footer">
        <div className="pb-preview-label">实时预览：</div>
        <div className="pb-preview-text">
          {selectedElements.length > 0 ? (
             selectedElements.map(e => (
               <span key={e.id} className="pb-preview-tag">
                 {e.emoji} {e.name}
               </span>
             ))
          ) : (
            <span className="pb-preview-empty">点击上方标签组合您的创意提示词...</span>
          )}
        </div>
      </div>
    </div>
  );
}
