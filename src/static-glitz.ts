export const styled = (...args: any[]) => Object.assign({}, ...args);
styled.div = (args: any) => args[0];
styled.Div = (props: any) => props.css;
