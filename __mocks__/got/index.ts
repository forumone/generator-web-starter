const got = jest.genMockFromModule<typeof import('got')>('got');

export = got;
