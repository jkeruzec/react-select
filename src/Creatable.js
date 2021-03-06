// @flow

import React, {
  Component,
  type Node,
  type ComponentType,
  type ElementRef,
} from 'react';
import Select, { type Props as SelectProps } from './Select';
import type { OptionType, OptionsType, ValueType, ActionMeta } from './types';
import { cleanValue } from './utils';
import manageState from './stateManager';

export type CreatableProps = {
  /* Allow options to be created while the `isLoading` prop is true. Useful to
     prevent the "create new ..." option being displayed while async results are
     still being loaded. */
  allowCreateWhileLoading: boolean,
  /* Gets the label for the "create new ..." option in the menu. Is given the
     current input value. */
  formatCreateLabel: string => Node,
  /* Determines whether the "create new ..." option should be displayed based on
     the current input value, select value and options array. */
  isValidNewOption: (string, ValueType, OptionsType) => boolean,
  /* Returns the data for the new option when it is created. Used to display the
     value, and is passed to `onChange`. */
  getNewOptionData: (string, Node) => OptionType,
  /* If provided, this will be called with the input value when a new option is
     created, and `onChange` will **not** be called. Use this when you need more
     control over what happens when new options are created. */
  onCreateOption?: string => void,
  /* Sets the position of the createOption element in your options list. Defaults to 'last' */
  createOptionPosition: 'first' | 'last',
};

export type Props = SelectProps & CreatableProps;

const builtins = {
  formatCreateLabel: (inputValue: string) => { 
	  return `Create "${inputValue}"`;
	  }
};

export const defaultProps = {
  allowCreateWhileLoading: false,
  createOptionPosition: 'last',
  ...builtins,
};

type State = {
  newOption: OptionType | void,
  options: OptionsType,
};

export const makeCreatableSelect = (SelectComponent: ComponentType<*>) =>
  class Creatable extends Component<Props, State> {
    static defaultProps = defaultProps;
    select: ElementRef<*>;
    constructor(props: Props) {
      super(props);
      const options = props.options || [];
      this.state = {
        newOption: undefined,
        options: options,
      };
    }
    componentWillReceiveProps(nextProps: Props) {
      const {
        allowCreateWhileLoading,
        createOptionPosition,
        formatCreateLabel,
        getNewOptionData,
        inputValue,
        isLoading,
        isValidNewOption,
        value,
      } = nextProps;
      const options = nextProps.options || [];
      let { newOption } = this.state;
      if (this.isValidNewOption(inputValue, cleanValue(value), options)) {
    	  
        newOption = this.getNewOptionData(inputValue, formatCreateLabel(inputValue));
        
      } else {
        newOption = undefined;
      }
      this.setState({
        newOption: newOption,
        options:
          (allowCreateWhileLoading || !isLoading) && newOption
            ? (createOptionPosition === 'first' ? [newOption, ...options] : [...options, newOption])
            : options,
      });
    }
    onChange = (newValue: ValueType, actionMeta: ActionMeta) => {
      const {
        getNewOptionData,
        inputValue,
        isMulti,
        onChange,
        onCreateOption,
        value,
      } = this.props;
      if (actionMeta.action !== 'select-option') {
        return onChange(newValue, actionMeta);
      }
      const { newOption } = this.state;
      const valueArray = Array.isArray(newValue) ? newValue : [newValue];

      if (valueArray[valueArray.length - 1] === newOption) {
        if (onCreateOption) onCreateOption(inputValue);
        else {
          const newOptionData = this.getNewOptionData(inputValue, inputValue);
          const newActionMeta = { action: 'create-option' };
          if (isMulti) {
            onChange([...cleanValue(value), newOptionData], newActionMeta);
          } else {
            onChange(newOptionData, newActionMeta);
          }
        }
        return;
      }
      onChange(newValue, actionMeta);
    };
    
    isValidNewOption (inputValue: string, selectValue: OptionsType, selectOptions: OptionsType) {
    	if (typeof this.props.isValidNewOption === 'function') {
    	      return this.props.isValidNewOption(inputValue, selectValue, selectOptions);
    	    } else {
    	return !(
    	      !inputValue ||
    	      selectValue.some(option => this.compareOption(inputValue, option)) ||
    	      selectOptions.some(option => this.compareOption(inputValue, option))
    	    )
    	    }
    }
	 
 compareOption(inputValue, option){
	 if (typeof this.props.compareOption === 'function') {
      return this.props.compareOption(inputValue, option);
    } else { 
	  const candidate = inputValue.toLowerCase();
	  return (
		  this.select.getOptionValue(option).toLowerCase() === candidate ||
		  this.select.getOptionLabel(option).toLowerCase() === candidate
	  );
    }
	};
		
	getNewOptionData(inputValue: string, optionLabel: string){
	 if (typeof this.props.getNewOptionData === 'function') {
	      return this.props.getNewOptionData(inputValue, optionLabel);
	    } else {
	    	// Mimic existing array
	    	// TODO : Ask user to give it's own field name ?
	    	if(Array.isArray(this.props.options) && this.props.options.length !== 0) {
	    		const optionFieldName = Object.keys(this.props.options[0]);
	    		let newOption = {__isNew__: true};
	    		newOption[optionFieldName[0]] = inputValue;
	    		newOption[optionFieldName[1]] = optionLabel;
	    		return newOption;
	    	}
		return {
	    label: optionLabel,
	    value: inputValue,
	    __isNew__: true};
	    }
	};
    
    focus() {
      this.select.focus();
    }
    blur() {
      this.select.blur();
    }
    render() {
      const { ...props } = this.props;
      const { options } = this.state;
      return (
        <SelectComponent
          {...props}
          ref={ref => {
            this.select = ref;
          }}
          options={options}
          onChange={this.onChange}
        />
      );
    }
  };

// TODO: do this in package entrypoint
export default manageState(makeCreatableSelect(Select));
